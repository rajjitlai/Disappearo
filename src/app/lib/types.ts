export interface Message {
    $id: string;
    $createdAt: string;
    sessionId: string;
    sender: string;
    text: string;
}

export interface Profile {
    $id: string;
    handle: string;
    strikes: number;
    banned: boolean;
    $createdAt: string;
}

export interface ChatRequestDoc {
    $id: string;
    fromId: string;
    toId: string;
    status: 'pending' | 'accepted' | 'rejected';
    $createdAt: string;
}

export interface ChatSessionDoc {
    $id: string;
    participants: string[];
    $createdAt: string;
}
