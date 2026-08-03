import { supabase } from './supabase';

export interface ChatMessage {
  id: string;
  booking_id: string;
  sender_type: 'customer' | 'technician' | 'admin';
  sender_id: string;
  sender_name: string;
  message: string;
  is_read: boolean;
  created_at: string;
  attachments?: ChatAttachment[];
}

export interface ChatAttachment {
  id: string;
  message_id: string;
  attachment_type: 'image' | 'voice' | 'file';
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  duration_seconds: number | null;
}

export async function fetchChatMessages(bookingId: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) return [];

  const messages = (data ?? []) as ChatMessage[];

  if (messages.length > 0) {
    const messageIds = messages.map((m) => m.id);
    const { data: attachments } = await supabase
      .from('chat_attachments')
      .select('*')
      .in('message_id', messageIds);

    if (attachments) {
      const attachmentMap = new Map<string, ChatAttachment[]>();
      for (const a of attachments as ChatAttachment[]) {
        const existing = attachmentMap.get(a.message_id) ?? [];
        existing.push(a);
        attachmentMap.set(a.message_id, existing);
      }
      for (const msg of messages) {
        msg.attachments = attachmentMap.get(msg.id);
      }
    }
  }

  return messages;
}

export async function sendChatMessage(
  bookingId: string,
  senderType: 'customer' | 'technician' | 'admin',
  senderId: string,
  senderName: string,
  message: string,
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      booking_id: bookingId,
      sender_type: senderType,
      sender_id: senderId,
      sender_name: senderName,
      message,
      is_read: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[chat] send message error:', error);
    return null;
  }

  return data as ChatMessage;
}

export async function sendChatWithAttachment(
  bookingId: string,
  senderType: 'customer' | 'technician' | 'admin',
  senderId: string,
  senderName: string,
  message: string,
  attachment: { type: 'image' | 'voice' | 'file'; url: string; name: string; size: number; duration?: number },
): Promise<ChatMessage | null> {
  const msg = await sendChatMessage(bookingId, senderType, senderId, senderName, message);
  if (!msg) return null;

  await supabase.from('chat_attachments').insert({
    message_id: msg.id,
    booking_id: bookingId,
    attachment_type: attachment.type,
    file_url: attachment.url,
    file_name: attachment.name,
    file_size: attachment.size,
    duration_seconds: attachment.duration ?? null,
  });

  msg.attachments = [{
    id: '',
    message_id: msg.id,
    attachment_type: attachment.type,
    file_url: attachment.url,
    file_name: attachment.name,
    file_size: attachment.size,
    duration_seconds: attachment.duration ?? null,
  }];

  return msg;
}

export async function markMessagesRead(bookingId: string, readerType: string): Promise<void> {
  await supabase
    .from('chat_messages')
    .update({ is_read: true })
    .eq('booking_id', bookingId)
    .neq('sender_type', readerType)
    .eq('is_read', false);
}

export function subscribeToChatMessages(
  bookingId: string,
  onNew: (message: ChatMessage) => void,
): (() => void) | null {
  const channel = supabase
    .channel(`chat:${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `booking_id=eq.${bookingId}` },
      (payload) => onNew(payload.new as ChatMessage),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export function subscribeToTyping(
  bookingId: string,
  onTyping: (data: { user_type: string; user_id: string; is_typing: boolean }) => void,
): (() => void) | null {
  const channel = supabase
    .channel(`typing:${bookingId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_typing', filter: `booking_id=eq.${bookingId}` },
      (payload) => {
        const row = payload.new as { user_type: string; user_id: string; is_typing: boolean };
        onTyping(row);
      },
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function setTyping(
  bookingId: string,
  userType: 'customer' | 'technician' | 'admin',
  userId: string,
  isTyping: boolean,
): Promise<void> {
  await supabase.from('chat_typing').upsert(
    {
      booking_id: bookingId,
      user_type: userType,
      user_id: userId,
      is_typing: isTyping,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'booking_id,user_type,user_id' },
  );
}
