// Message types for chat interface
export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
}

// Component props types
export interface KeyInputProps {
	onKeySet: (key: string) => void;
}

export interface ChatInterfaceProps {
	apiKey: string;
	onKeyDeleted: () => void;
}

export interface MessageListProps {
	messages: Message[];
}

export interface MessageInputProps {
	onSend: (text: string) => void;
	disabled?: boolean;
}

