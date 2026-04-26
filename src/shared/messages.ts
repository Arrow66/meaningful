export const LOOKUP_MESSAGE_TYPE = 'meaningful:lookup';

export interface LookupMessage {
  type: typeof LOOKUP_MESSAGE_TYPE;
  word: string;
}

export function isLookupMessage(message: unknown): message is LookupMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    'type' in message &&
    'word' in message &&
    message.type === LOOKUP_MESSAGE_TYPE &&
    typeof message.word === 'string'
  );
}
