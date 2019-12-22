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
 * @param {string} message 
 */
export const updateStatus = (message: string) => {
  sendMessageEvent('savingEvent', message);
}
