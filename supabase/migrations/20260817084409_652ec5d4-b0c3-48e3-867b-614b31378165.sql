CREATE INDEX IF NOT EXISTS idx_conversations_user_repo ON public.conversations(user_id, repository_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_proposed_edits_message_id ON public.proposed_edits(message_id);