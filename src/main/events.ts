import konsole from './console_log.js';

export enum SaveAllStatus {
  Dirty = 'green',
  Processing = 'orange',
  Failed = 'red',
  Success = '',
}

export const SAVE_ALL_STATUS = 'saveAllStatus';
export const SAVING_EVENT = 'savingEvent';

/**
 * Emit an event containing a message
 * @param {string} type 
 * @param {string} message 
 */
export const sendMessageEvent = (type: string, message: string): void => {
  const msg = `${new Date()} - ${message}`;
  konsole.log(`Sending event: ${type}, detail: ${msg}`);
  const event = new CustomEvent(type, { detail: msg});
  document.dispatchEvent(event);
}

/**
 * Emit an event containing a message for the status field
 * @param message 
 */
export const updateStatus = (message: string) => {
  sendMessageEvent(SAVING_EVENT, message);
}

export const save_all_status = (status: SaveAllStatus) => {
  document.dispatchEvent(new CustomEvent(SAVE_ALL_STATUS, {detail: status}));
}