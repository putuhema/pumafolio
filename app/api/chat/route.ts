import { handleChat } from "@/lib/chat-handler";

export async function POST(request: Request) {
  return handleChat(request);
}
