import type { AlertEmail } from "./domain";

export function findAlertEmails(query: string, maximumThreads: number): AlertEmail[] {
  const threads = GmailApp.search(query, 0, maximumThreads);
  return threads
    .flatMap((thread) => thread.getMessages())
    .map((message) => ({
      id: message.getId(),
      subject: message.getSubject(),
      sender: message.getFrom(),
      receivedAt: new Date(message.getDate().getTime()),
      plainBody: message.getPlainBody(),
      htmlBody: message.getBody()
    }))
    .sort((left, right) => left.receivedAt.getTime() - right.receivedAt.getTime());
}
