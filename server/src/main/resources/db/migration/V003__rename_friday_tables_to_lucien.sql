-- Rename friday_* tables to lucien_* (idempotent — tables may already be renamed)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friday_chat_sessions')
 AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lucien_chat_sessions') THEN
    ALTER TABLE friday_chat_sessions  RENAME TO lucien_chat_sessions;
    ALTER TABLE friday_chat_messages  RENAME TO lucien_chat_messages;
    ALTER TABLE friday_system_prompts RENAME TO lucien_system_prompts;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lucien_system_prompts') THEN
    UPDATE lucien_system_prompts SET prompt_key = 'LUCIEN_AGENT_ASSISTANT_V1' WHERE prompt_key = 'FRIDAY_AGENT_ASSISTANT_V1';
  END IF;
END $$;
