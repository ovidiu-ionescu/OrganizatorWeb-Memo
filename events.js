/**
 * Emit an event containing a message
 * @param {String} type 
 * @param {String} message 
 */
export const sendMessageEvent = (type, message) => {
  console.log('Status message:', message);
  const msg = `${new Date()} - ${message}`;
  const event = new CustomEvent(type, { detail: msg});
  document.dispatchEvent(event);
}

/**
 * Emit an event containing a message for the status field
 * @param {String} message 
 */
export const updateStatus = message => {
  sendMessageEvent('savingEvent', message);
}