import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  MessageSquare,
  Send,
  Users,
  Mail,
  Loader2,
  Trash2,
  Check,
  User,
  Megaphone
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface Message {
  id: number;
  organizationId: number;
  senderId: string;
  recipientId: string | null;
  subject: string | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  isBroadcast: boolean;
}

interface OrganizationMember {
  id: number;
  organizationId: number;
  userId: string;
  role: string;
  firstName: string;
  lastName: string;
  email: string;
  joinedAt: string;
}

interface Organization {
  id: number;
  name: string;
  ownerId: string;
  isOwner: boolean;
}

export default function MessagesPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isComposing, setIsComposing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [newMessage, setNewMessage] = useState({
    recipientId: "",
    subject: "",
    content: "",
  });

  const { data: organization } = useQuery<Organization | null>({
    queryKey: ["/api/organization"],
    enabled: !!user,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
    enabled: !!user && !!organization,
  });

  const { data: members = [] } = useQuery<OrganizationMember[]>({
    queryKey: ["/api/organization/members"],
    enabled: !!user && !!organization,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: { recipientId: string | null; subject: string; content: string }) => {
      const response = await apiRequest("POST", "/api/messages", {
        recipientId: data.recipientId || null,
        subject: data.subject || null,
        content: data.content,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setIsComposing(false);
      setNewMessage({ recipientId: "", subject: "", content: "" });
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      setSelectedMessage(null);
      toast({
        title: "Message deleted",
        description: "The message has been deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete message.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!newMessage.content.trim()) {
      toast({
        title: "Error",
        description: "Please enter a message.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate({
      recipientId: newMessage.recipientId === "everyone" ? null : (newMessage.recipientId || null),
      subject: newMessage.subject,
      content: newMessage.content,
    });
  };

  const handleSelectMessage = (message: Message) => {
    setSelectedMessage(message);
    if (!message.isRead && message.senderId !== user?.id) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
  };

  if (!user) {
    return null;
  }

  if (!organization) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-4xl mx-auto py-8 px-4">
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="btn-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Team Messages</h1>
              <p className="text-muted-foreground">Internal messaging for your team</p>
            </div>
          </div>
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Organization</h3>
              <p className="text-muted-foreground mb-4">
                You need to be part of an organization to use team messaging.
              </p>
              <Button onClick={() => navigate("/profile")} data-testid="btn-go-profile">
                Set Up Organization
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="btn-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Team Messages</h1>
              <p className="text-muted-foreground">{organization.name}</p>
            </div>
          </div>
          <Dialog open={isComposing} onOpenChange={setIsComposing}>
            <DialogTrigger asChild>
              <Button data-testid="btn-compose">
                <Send className="h-4 w-4 mr-2" />
                Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>
                  Send a message to a team member or broadcast to everyone.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">To</label>
                  <Select
                    value={newMessage.recipientId}
                    onValueChange={(value) => setNewMessage({ ...newMessage, recipientId: value })}
                  >
                    <SelectTrigger data-testid="select-recipient">
                      <SelectValue placeholder="Select recipient or Everyone" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">
                        <div className="flex items-center gap-2">
                          <Megaphone className="h-4 w-4" />
                          Everyone (Broadcast)
                        </div>
                      </SelectItem>
                      {members
                        .filter((m) => m.userId !== user?.id)
                        .map((member) => (
                          <SelectItem key={member.userId} value={member.userId}>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              {member.firstName} {member.lastName}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Subject (optional)</label>
                  <Input
                    placeholder="Message subject"
                    value={newMessage.subject}
                    onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                    data-testid="input-subject"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea
                    placeholder="Type your message..."
                    value={newMessage.content}
                    onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                    rows={5}
                    data-testid="input-message-content"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsComposing(false)}
                  data-testid="btn-cancel-compose"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendMessage}
                  disabled={sendMessageMutation.isPending || !newMessage.content.trim()}
                  data-testid="btn-send-message"
                >
                  {sendMessageMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Inbox
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {messagesLoading ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : messages.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                </div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <div className="divide-y">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`p-3 cursor-pointer hover-elevate ${
                          selectedMessage?.id === message.id ? "bg-accent" : ""
                        } ${!message.isRead && message.senderId !== user?.id ? "bg-primary/5" : ""}`}
                        onClick={() => handleSelectMessage(message)}
                        data-testid={`message-item-${message.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              {message.isBroadcast && (
                                <Megaphone className="h-3 w-3 text-primary shrink-0" />
                              )}
                              <span className="font-medium text-sm truncate">
                                {message.senderId === user?.id ? `To: ${message.recipientName}` : message.senderName}
                              </span>
                              {!message.isRead && message.senderId !== user?.id && (
                                <Badge variant="default" className="h-4 text-[10px] px-1">New</Badge>
                              )}
                            </div>
                            {message.subject && (
                              <p className="text-sm text-muted-foreground truncate">{message.subject}</p>
                            )}
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              {message.content.substring(0, 50)}...
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(message.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardContent className="p-0">
              {selectedMessage ? (
                <div className="h-[540px] flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {selectedMessage.isBroadcast && (
                            <Badge variant="secondary" className="h-5">
                              <Megaphone className="h-3 w-3 mr-1" />
                              Broadcast
                            </Badge>
                          )}
                          <h3 className="font-semibold">
                            {selectedMessage.subject || "(No Subject)"}
                          </h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          From: {selectedMessage.senderName} ({selectedMessage.senderEmail})
                        </p>
                        <p className="text-sm text-muted-foreground">
                          To: {selectedMessage.recipientName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(selectedMessage.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {selectedMessage.senderId === user?.id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMessageMutation.mutate(selectedMessage.id)}
                          disabled={deleteMessageMutation.isPending}
                          data-testid="btn-delete-message"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <ScrollArea className="flex-1 p-4">
                    <div className="whitespace-pre-wrap" data-testid="message-content">
                      {selectedMessage.content}
                    </div>
                  </ScrollArea>
                  {selectedMessage.isRead && selectedMessage.senderId === user?.id && (
                    <div className="p-3 border-t text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Read
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[540px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Select a message to read</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
