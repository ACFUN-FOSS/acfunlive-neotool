mod key;

use std::{any::Any, collections::HashMap};

use device_query::{DeviceEvents, DeviceState};
use enigo::{Enigo, KeyboardControllable};
use once_cell::sync::Lazy;
use tauri::{
    api::ipc::{format_callback, CallbackFn},
    command,
    plugin::{Builder, TauriPlugin},
    Manager, Runtime, State, Window,
};
use tokio::sync::Mutex;

use key::{Input, Key};

type Result<T> = std::result::Result<T, ()>;

type Id = u32;

static ID: Lazy<Mutex<Id>> = Lazy::new(|| Mutex::new(0));

#[inline]
async fn new_id() -> Id {
    let mut id = ID.lock().await;
    *id += 1;

    *id
}

#[derive(Debug)]
struct ListenData {
    _key_down_guard: Box<dyn Any + Send + Sync + 'static>,
    _key_up_guard: Box<dyn Any + Send + Sync + 'static>,
}

#[derive(Debug, Default)]
struct ListenManager(Mutex<HashMap<Id, ListenData>>);

#[command]
async fn start_listen<R: Runtime>(
    window: Window<R>,
    key_down_callback: CallbackFn,
    key_up_callback: CallbackFn,
) -> Id {
    let (key_down_guard, key_up_guard) = {
        let device_state = DeviceState::new();
        let key_down_guard = {
            let window = window.clone();
            device_state.on_key_down(move |key| {
                let js = format_callback(key_down_callback, &Key::from(*key))
                    .expect("unable to serialize keyboard down key");
                let _ = window.eval(&js);
            })
        };
        let key_up_guard = {
            let window = window.clone();
            device_state.on_key_up(move |key| {
                let js = format_callback(key_up_callback, &Key::from(*key))
                    .expect("unable to serialize keyboard up key");
                let _ = window.eval(&js);
            })
        };

        (key_down_guard, key_up_guard)
    };

    let id = new_id().await;
    let manager = window.state::<ListenManager>();

    manager.0.lock().await.insert(
        id,
        ListenData {
            _key_down_guard: Box::new(key_down_guard),
            _key_up_guard: Box::new(key_up_guard),
        },
    );

    id
}

#[command]
#[inline]
async fn stop_listen(manager: State<'_, ListenManager>, id: Id) -> Result<()> {
    manager.0.lock().await.remove(&id);

    Ok(())
}

#[derive(Debug, Default)]
struct InputManager(Mutex<Enigo>);

#[command]
#[inline]
async fn simulate_input(manager: State<'_, InputManager>, input: Input) -> Result<()> {
    let mut enigo = manager.0.lock().await;
    match input {
        Input::KeyDown(key) => enigo.key_down(key.into()),
        Input::KeyUp(key) => enigo.key_up(key.into()),
        Input::Text(text) => enigo.key_sequence(&text),
    }

    Ok(())
}

/// Initializes the plugin.
#[inline]
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("acfunlive-neotool-keyboard")
        .invoke_handler(tauri::generate_handler![
            start_listen,
            stop_listen,
            simulate_input
        ])
        .setup(|app| {
            app.manage(ListenManager::default());
            app.manage(InputManager::default());

            Ok(())
        })
        .build()
}
