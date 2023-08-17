use std::{
    fmt::{Display, Formatter},
    str::FromStr,
};

use device_query::Keycode;
use enigo::Key as EnigoKey;
use serde::{de::Visitor, Deserialize, Deserializer, Serialize, Serializer};

#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub(crate) struct Key(Keycode);

impl From<Keycode> for Key {
    #[inline]
    fn from(value: Keycode) -> Self {
        Self(value)
    }
}

impl From<Key> for Keycode {
    #[inline]
    fn from(value: Key) -> Self {
        value.0
    }
}

impl Display for Key {
    #[inline]
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        f.write_str(match self.0 {
            Keycode::Key0 => "0",
            Keycode::Key1 => "1",
            Keycode::Key2 => "2",
            Keycode::Key3 => "3",
            Keycode::Key4 => "4",
            Keycode::Key5 => "5",
            Keycode::Key6 => "6",
            Keycode::Key7 => "7",
            Keycode::Key8 => "8",
            Keycode::Key9 => "9",
            Keycode::A => "A",
            Keycode::B => "B",
            Keycode::C => "C",
            Keycode::D => "D",
            Keycode::E => "E",
            Keycode::F => "F",
            Keycode::G => "G",
            Keycode::H => "H",
            Keycode::I => "I",
            Keycode::J => "J",
            Keycode::K => "K",
            Keycode::L => "L",
            Keycode::M => "M",
            Keycode::N => "N",
            Keycode::O => "O",
            Keycode::P => "P",
            Keycode::Q => "Q",
            Keycode::R => "R",
            Keycode::S => "S",
            Keycode::T => "T",
            Keycode::U => "U",
            Keycode::V => "V",
            Keycode::W => "W",
            Keycode::X => "X",
            Keycode::Y => "Y",
            Keycode::Z => "Z",
            Keycode::F1 => "F1",
            Keycode::F2 => "F2",
            Keycode::F3 => "F3",
            Keycode::F4 => "F4",
            Keycode::F5 => "F5",
            Keycode::F6 => "F6",
            Keycode::F7 => "F7",
            Keycode::F8 => "F8",
            Keycode::F9 => "F9",
            Keycode::F10 => "F10",
            Keycode::F11 => "F11",
            Keycode::F12 => "F12",
            Keycode::Escape => "Escape",
            Keycode::Space => "Space",
            Keycode::LControl => "LControl",
            Keycode::RControl => "RControl",
            Keycode::LShift => "LShift",
            Keycode::RShift => "RShift",
            Keycode::LAlt => "LAlt",
            Keycode::RAlt => "RAlt",
            Keycode::Meta => "Meta",
            Keycode::Enter => "Enter",
            Keycode::Up => "Up",
            Keycode::Down => "Down",
            Keycode::Left => "Left",
            Keycode::Right => "Right",
            Keycode::Backspace => "Backspace",
            Keycode::CapsLock => "CapsLock",
            Keycode::Tab => "Tab",
            Keycode::Home => "Home",
            Keycode::End => "End",
            Keycode::PageUp => "PageUp",
            Keycode::PageDown => "PageDown",
            Keycode::Insert => "Insert",
            Keycode::Delete => "Delete",
            Keycode::Numpad0 => "0",
            Keycode::Numpad1 => "1",
            Keycode::Numpad2 => "2",
            Keycode::Numpad3 => "3",
            Keycode::Numpad4 => "4",
            Keycode::Numpad5 => "5",
            Keycode::Numpad6 => "6",
            Keycode::Numpad7 => "7",
            Keycode::Numpad8 => "8",
            Keycode::Numpad9 => "9",
            Keycode::NumpadSubtract => "-",
            Keycode::NumpadAdd => "+",
            Keycode::NumpadDivide => "/",
            Keycode::NumpadMultiply => "*",
            Keycode::Grave => "`",
            Keycode::Minus => "-",
            Keycode::Equal => "=",
            Keycode::LeftBracket => "[",
            Keycode::RightBracket => "]",
            Keycode::BackSlash => "\\",
            Keycode::Semicolon => ";",
            Keycode::Apostrophe => "'",
            Keycode::Comma => ",",
            Keycode::Dot => ".",
            Keycode::Slash => "/",
        })
    }
}

impl FromStr for Key {
    type Err = String;

    #[inline]
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(Key(match s {
            "0" => Keycode::Key0,
            "1" => Keycode::Key1,
            "2" => Keycode::Key2,
            "3" => Keycode::Key3,
            "4" => Keycode::Key4,
            "5" => Keycode::Key5,
            "6" => Keycode::Key6,
            "7" => Keycode::Key7,
            "8" => Keycode::Key8,
            "9" => Keycode::Key9,
            "A" => Keycode::A,
            "B" => Keycode::B,
            "C" => Keycode::C,
            "D" => Keycode::D,
            "E" => Keycode::E,
            "F" => Keycode::F,
            "G" => Keycode::G,
            "H" => Keycode::H,
            "I" => Keycode::I,
            "J" => Keycode::J,
            "K" => Keycode::K,
            "L" => Keycode::L,
            "M" => Keycode::M,
            "N" => Keycode::N,
            "O" => Keycode::O,
            "P" => Keycode::P,
            "Q" => Keycode::Q,
            "R" => Keycode::R,
            "S" => Keycode::S,
            "T" => Keycode::T,
            "U" => Keycode::U,
            "V" => Keycode::V,
            "W" => Keycode::W,
            "X" => Keycode::X,
            "Y" => Keycode::Y,
            "Z" => Keycode::Z,
            "F1" => Keycode::F1,
            "F2" => Keycode::F2,
            "F3" => Keycode::F3,
            "F4" => Keycode::F4,
            "F5" => Keycode::F5,
            "F6" => Keycode::F6,
            "F7" => Keycode::F7,
            "F8" => Keycode::F8,
            "F9" => Keycode::F9,
            "F10" => Keycode::F10,
            "F11" => Keycode::F11,
            "F12" => Keycode::F12,
            "Escape" => Keycode::Escape,
            "Space" => Keycode::Space,
            "LControl" => Keycode::LControl,
            "RControl" => Keycode::RControl,
            "LShift" => Keycode::LShift,
            "RShift" => Keycode::RShift,
            "LAlt" => Keycode::LAlt,
            "RAlt" => Keycode::RAlt,
            "Meta" => Keycode::Meta,
            "Enter" => Keycode::Enter,
            "Up" => Keycode::Up,
            "Down" => Keycode::Down,
            "Left" => Keycode::Left,
            "Right" => Keycode::Right,
            "Backspace" => Keycode::Backspace,
            "CapsLock" => Keycode::CapsLock,
            "Tab" => Keycode::Tab,
            "Home" => Keycode::Home,
            "End" => Keycode::End,
            "PageUp" => Keycode::PageUp,
            "PageDown" => Keycode::PageDown,
            "Insert" => Keycode::Insert,
            "Delete" => Keycode::Delete,
            "+" => Keycode::NumpadAdd,
            "*" => Keycode::NumpadMultiply,
            "`" => Keycode::Grave,
            "-" => Keycode::Minus,
            "=" => Keycode::Equal,
            "[" => Keycode::LeftBracket,
            "]" => Keycode::RightBracket,
            "\\" => Keycode::BackSlash,
            ";" => Keycode::Semicolon,
            "'" => Keycode::Apostrophe,
            "," => Keycode::Comma,
            "." => Keycode::Dot,
            "/" => Keycode::Slash,
            other => return Err(format!("failed to parse {} to keyboard key", other)),
        }))
    }
}

impl Serialize for Key {
    #[inline]
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Clone, Copy, Debug)]
struct KeyVisitor;

impl<'de> Visitor<'de> for KeyVisitor {
    type Value = Key;

    #[inline]
    fn expecting(&self, formatter: &mut Formatter) -> std::fmt::Result {
        formatter.write_str("an string represents the keyboard key")
    }

    #[inline]
    fn visit_str<E>(self, v: &str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        match Key::from_str(v) {
            Ok(key) => Ok(key),
            Err(err) => Err(E::custom(err)),
        }
    }

    #[inline]
    fn visit_borrowed_str<E>(self, v: &'de str) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        match Key::from_str(v) {
            Ok(key) => Ok(key),
            Err(err) => Err(E::custom(err)),
        }
    }

    #[inline]
    fn visit_string<E>(self, v: String) -> Result<Self::Value, E>
    where
        E: serde::de::Error,
    {
        match Key::from_str(&v) {
            Ok(key) => Ok(key),
            Err(err) => Err(E::custom(err)),
        }
    }
}

impl<'de> Deserialize<'de> for Key {
    #[inline]
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        deserializer.deserialize_str(KeyVisitor)
    }
}

impl From<Key> for EnigoKey {
    #[inline]
    fn from(value: Key) -> Self {
        match value.0 {
            Keycode::Key0 => EnigoKey::Layout('0'),
            Keycode::Key1 => EnigoKey::Layout('1'),
            Keycode::Key2 => EnigoKey::Layout('2'),
            Keycode::Key3 => EnigoKey::Layout('3'),
            Keycode::Key4 => EnigoKey::Layout('4'),
            Keycode::Key5 => EnigoKey::Layout('5'),
            Keycode::Key6 => EnigoKey::Layout('6'),
            Keycode::Key7 => EnigoKey::Layout('7'),
            Keycode::Key8 => EnigoKey::Layout('8'),
            Keycode::Key9 => EnigoKey::Layout('9'),
            Keycode::A => EnigoKey::Layout('a'),
            Keycode::B => EnigoKey::Layout('b'),
            Keycode::C => EnigoKey::Layout('c'),
            Keycode::D => EnigoKey::Layout('d'),
            Keycode::E => EnigoKey::Layout('e'),
            Keycode::F => EnigoKey::Layout('f'),
            Keycode::G => EnigoKey::Layout('g'),
            Keycode::H => EnigoKey::Layout('h'),
            Keycode::I => EnigoKey::Layout('i'),
            Keycode::J => EnigoKey::Layout('j'),
            Keycode::K => EnigoKey::Layout('k'),
            Keycode::L => EnigoKey::Layout('l'),
            Keycode::M => EnigoKey::Layout('m'),
            Keycode::N => EnigoKey::Layout('n'),
            Keycode::O => EnigoKey::Layout('o'),
            Keycode::P => EnigoKey::Layout('p'),
            Keycode::Q => EnigoKey::Layout('q'),
            Keycode::R => EnigoKey::Layout('r'),
            Keycode::S => EnigoKey::Layout('s'),
            Keycode::T => EnigoKey::Layout('t'),
            Keycode::U => EnigoKey::Layout('u'),
            Keycode::V => EnigoKey::Layout('v'),
            Keycode::W => EnigoKey::Layout('w'),
            Keycode::X => EnigoKey::Layout('x'),
            Keycode::Y => EnigoKey::Layout('y'),
            Keycode::Z => EnigoKey::Layout('z'),
            Keycode::F1 => EnigoKey::F1,
            Keycode::F2 => EnigoKey::F2,
            Keycode::F3 => EnigoKey::F3,
            Keycode::F4 => EnigoKey::F4,
            Keycode::F5 => EnigoKey::F5,
            Keycode::F6 => EnigoKey::F6,
            Keycode::F7 => EnigoKey::F7,
            Keycode::F8 => EnigoKey::F8,
            Keycode::F9 => EnigoKey::F9,
            Keycode::F10 => EnigoKey::F10,
            Keycode::F11 => EnigoKey::F11,
            Keycode::F12 => EnigoKey::F12,
            Keycode::Escape => EnigoKey::Escape,
            Keycode::Space => EnigoKey::Space,
            Keycode::LControl => EnigoKey::LControl,
            Keycode::RControl => EnigoKey::RControl,
            Keycode::LShift => EnigoKey::LShift,
            Keycode::RShift => EnigoKey::RShift,
            Keycode::LAlt => EnigoKey::Alt,
            Keycode::RAlt => EnigoKey::Alt,
            Keycode::Meta => EnigoKey::Meta,
            Keycode::Enter => EnigoKey::Return,
            Keycode::Up => EnigoKey::UpArrow,
            Keycode::Down => EnigoKey::DownArrow,
            Keycode::Left => EnigoKey::LeftArrow,
            Keycode::Right => EnigoKey::RightArrow,
            Keycode::Backspace => EnigoKey::Backspace,
            Keycode::CapsLock => EnigoKey::CapsLock,
            Keycode::Tab => EnigoKey::Tab,
            Keycode::Home => EnigoKey::Home,
            Keycode::End => EnigoKey::End,
            Keycode::PageUp => EnigoKey::PageUp,
            Keycode::PageDown => EnigoKey::PageDown,
            Keycode::Insert => EnigoKey::Insert,
            Keycode::Delete => EnigoKey::Delete,
            Keycode::Numpad0 => EnigoKey::Layout('0'),
            Keycode::Numpad1 => EnigoKey::Layout('1'),
            Keycode::Numpad2 => EnigoKey::Layout('2'),
            Keycode::Numpad3 => EnigoKey::Layout('3'),
            Keycode::Numpad4 => EnigoKey::Layout('4'),
            Keycode::Numpad5 => EnigoKey::Layout('5'),
            Keycode::Numpad6 => EnigoKey::Layout('6'),
            Keycode::Numpad7 => EnigoKey::Layout('7'),
            Keycode::Numpad8 => EnigoKey::Layout('8'),
            Keycode::Numpad9 => EnigoKey::Layout('9'),
            Keycode::NumpadSubtract => EnigoKey::Layout('-'),
            Keycode::NumpadAdd => EnigoKey::Layout('+'),
            Keycode::NumpadDivide => EnigoKey::Layout('/'),
            Keycode::NumpadMultiply => EnigoKey::Layout('*'),
            Keycode::Grave => EnigoKey::Layout('`'),
            Keycode::Minus => EnigoKey::Layout('-'),
            Keycode::Equal => EnigoKey::Layout('='),
            Keycode::LeftBracket => EnigoKey::Layout('{'),
            Keycode::RightBracket => EnigoKey::Layout('}'),
            Keycode::BackSlash => EnigoKey::Layout('\\'),
            Keycode::Semicolon => EnigoKey::Layout(';'),
            Keycode::Apostrophe => EnigoKey::Layout('\''),
            Keycode::Comma => EnigoKey::Layout(','),
            Keycode::Dot => EnigoKey::Layout('.'),
            Keycode::Slash => EnigoKey::Layout('/'),
        }
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub(crate) enum Input {
    KeyDown(Key),
    KeyUp(Key),
    Text(String),
}
