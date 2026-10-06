// Header carrying the browser's random device ID, so signed-out chat limits are per
// device rather than shared by everyone on a network. Never tied to an account.
export const DEVICE_HEADER = "x-bubble-device";
