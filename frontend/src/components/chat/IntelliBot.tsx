import React, { useState, useEffect, useRef } from 'react';
import {
    X, Send, Bot, User, Sparkles, MessageSquare, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card, CardContent, CardFooter, CardHeader, CardTitle
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/api/client';
import { useToast } from '@/components/ui/use-toast';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { setIntelliBotOpen } from '@/features/ui/uiSlice';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export const IntelliBot: React.FC = () => {
    const dispatch = useDispatch();
    const { isIntelliBotOpen: isOpen } = useSelector((state: RootState) => state.ui);
    const [mode, setMode] = useState<'system' | 'document'>('system');
    const [messages, setMessages] = useState<Record<string, Message[]>>({
        system: [{
            role: 'assistant',
            content: "Hello! I'm IntelliBot, your system assistant. I can help you navigate IntelliDocX, understand workflows, or answer general questions.",
        }],
        document: [{
            role: 'assistant',
            content: "Select a document from the dropdown below to start asking questions about it.",
        }]
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    // Document selection state
    const [documents, setDocuments] = useState<any[]>([]);
    const [selectedDoc, setSelectedDoc] = useState<any | null>(null);

    const setIsOpen = (val: boolean) => dispatch(setIntelliBotOpen(val));

    useEffect(() => {
        if (isOpen && documents.length === 0) {
            fetchDocuments();
        }
    }, [isOpen]);

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/documents?limit=10');
            setDocuments(res.data.data || []);
            if (res.data.data?.length > 0 && !selectedDoc) {
                setSelectedDoc(res.data.data[0]);
                // Re-initialize document welcome message with selected doc
                setMessages(prev => ({
                    ...prev,
                    document: [{
                        role: 'assistant',
                        content: `I'm ready to answer questions about "${res.data.data[0].title}". What would you like to know?`
                    }]
                }));
            }
        } catch (error) {
            console.error('Failed to fetch docs for IntelliBot', error);
        }
    };

    const handleDocSelect = (doc: any) => {
        setSelectedDoc(doc);
        setMessages(prev => ({
            ...prev,
            document: [{
                role: 'assistant',
                content: `I'm ready to answer questions about "${doc.title}". What would you like to know?`
            }]
        }));
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, mode, isOpen]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        if (mode === 'document' && !selectedDoc) {
            toast({ title: 'Alert', description: 'Please select a document first.' });
            return;
        }

        const userMessage = input.trim();
        setInput('');
        
        setMessages(prev => ({
            ...prev,
            [mode]: [...prev[mode], { role: 'user', content: userMessage }]
        }));
        
        setIsLoading(true);

        try {
            let response;
            if (mode === 'system') {
                response = await api.post('/chat/system', {
                    message: userMessage,
                    history: messages.system.map(m => ({
                        role: m.role, content: m.content
                    }))
                });
            } else {
                response = await api.post(`/documents/${selectedDoc.id}/chat`, {
                    message: userMessage,
                    history: messages.document.map(m => ({
                        role: m.role, content: m.content
                    }))
                });
            }

            setMessages(prev => ({
                ...prev,
                [mode]: [...prev[mode], {
                    role: 'assistant',
                    content: response.data.data?.answer || response.data.answer || "I received an empty response."
                }]
            }));
        } catch (error: any) {
            console.error('Chat error:', error);
            
            // Check if backend returned an API key missing error to replace it with a user-friendly message
            const rawErrorMsg = error.response?.data?.message || error.message || '';
            let finalMessage = "I'm sorry, I encountered an error while processing your request. Please try again later.";
            
            if (rawErrorMsg.toLowerCase().includes('api key missing') || 
                rawErrorMsg.toLowerCase().includes('api_key') ||
                rawErrorMsg.toLowerCase().includes('authentication_error')) {
                finalMessage = "Chat is currently unavailable. Please contact your administrator.";
            }

            setMessages(prev => ({
                ...prev,
                [mode]: [...prev[mode], {
                    role: 'assistant',
                    content: finalMessage
                }]
            }));
        } finally {
            setIsLoading(false);
        }
    };

    const currentMessages = messages[mode];

    if (!isOpen) {
        return (
            <Button
                size="icon"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-50 animate-bounce hover:animate-none bg-indigo-600 text-white hover:scale-110 transition-transform"
                onClick={() => setIsOpen(true)}
            >
                <Bot size={28} />
            </Button>
        );
    }

    return (
        <Card className="fixed bottom-6 right-6 w-[400px] h-[650px] shadow-2xl flex flex-col z-[100] border-primary/20 animate-in slide-in-from-bottom-10 duration-300">
            <CardHeader className="bg-gradient-to-r from-primary to-indigo-600 text-primary-foreground p-3 flex flex-row items-center justify-between rounded-t-lg">
                <div className="flex items-center gap-2">
                    <div className="bg-white/20 p-2 rounded-full">
                        <Sparkles className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                    </div>
                    <div>
                        <CardTitle className="text-base font-bold">IntelliBot</CardTitle>
                        <p className="text-xs text-primary-foreground/80">Premium AI Assistant</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="h-8 w-8 text-primary-foreground hover:bg-white/20 hover:text-white"
                >
                    <X className="h-5 w-5" />
                </Button>
            </CardHeader>

            <Tabs defaultValue="system" value={mode} onValueChange={(v) => setMode(v as any)} className="w-full flex-1 flex flex-col">
                <div className="px-4 pt-3 pb-1 border-b">
                     <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="system" className="flex items-center gap-2">
                            <Bot size={14} /> System
                        </TabsTrigger>
                        <TabsTrigger value="document" className="flex items-center gap-2">
                            <MessageSquare size={14} /> Document
                        </TabsTrigger>
                    </TabsList>
                </div>
                
                {mode === 'document' && (
                    <div className="px-4 py-2 border-b bg-muted/20 flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Context:</span>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-7 text-xs max-w-[200px] flex justify-between">
                                    <span className="truncate">{selectedDoc?.title || "Select Document"}</span>
                                    <ChevronDown className="ml-2 h-3 w-3 shrink-0" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px]">
                                {documents.map(doc => (
                                    <DropdownMenuItem key={doc.id} onClick={() => handleDocSelect(doc)} className="text-xs cursor-pointer">
                                        <span className="truncate">{doc.title}</span>
                                    </DropdownMenuItem>
                                ))}
                                {documents.length === 0 && (
                                    <div className="p-2 text-xs text-muted-foreground text-center">No documents available</div>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}

                <CardContent className="flex-1 p-4 overflow-hidden flex flex-col bg-slate-50 dark:bg-slate-900/50">
                    <div ref={scrollRef} className="flex-1 pr-2 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-4">
                            {currentMessages.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center border shrink-0 shadow-sm ${m.role === 'assistant' ? 'bg-primary border-primary text-primary-foreground' : 'bg-background border-muted'}`}>
                                            {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                                        </div>
                                        <div className={`rounded-xl p-3 text-sm shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-background border rounded-tl-none'}`}>
                                            {m.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex gap-2">
                                        <div className="h-8 w-8 rounded-full flex items-center justify-center border bg-primary border-primary text-primary-foreground shrink-0 shadow-sm">
                                            <Bot size={16} />
                                        </div>
                                        <div className="bg-background border rounded-xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                                            <div className="flex space-x-1">
                                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                                <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>

                <CardFooter className="p-3 border-t bg-background">
                    <div className="flex w-full gap-2 items-end">
                        <Input
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            disabled={isLoading}
                            className="flex-1 focus-visible:ring-indigo-500 rounded-full px-4"
                        />
                        <Button
                            size="icon"
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="rounded-full bg-indigo-600 hover:bg-indigo-700 hover:scale-105 transition-all text-white shrink-0 shadow-md"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </CardFooter>
            </Tabs>
        </Card>
    );
};
