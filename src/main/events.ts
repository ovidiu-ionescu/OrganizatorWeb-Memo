export const SAVE_ALL_FINISHED = 'saveAllFinished';
export const SAVING_EVENT = 'savingEvent';

/**
 * Emit an event containing a message
 * @param {string} type 
 * @param {string} message 
 */
export const sendMessageEvent = (type: string, message: string): void => {
  console.log('Status message:', message);
  const msg = `${new Date()} - ${message}`;
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

export const save_all_status = () => {
  sendMessageEvent(SAVE_ALL_FINISHED, '');
}