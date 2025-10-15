
export interface MessageSegment {
  text: string;
  citation_id?: number;
}

export interface Citation {
  citation_id: number;
  source_id: string;
  source_title: string;
  source_type: string;
  chunk_lines_from?: number;
  chunk_lines_to?: number;
  chunk_index?: number;
  excerpt?: string;
}

export interface EnhancedChatMessage {
  id: number;
  session_id: string;
  message: {
    type: 'human' | 'ai';
    content: string | {
      segments: MessageSegment[];
      citations: Citation[];
    };
    additional_kwargs?: Record<string, unknown>;
    response_metadata?: Record<string, unknown>;
    tool_calls?: Record<string, unknown>[];
    invalid_tool_calls?: Record<string, unknown>[];
  };
}
