import { useState, useEffect } from 'react';
import {
  Toast,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast';

type ToastType = 'success' | 'error' | 'info';

type ToastMessage = {
  id: string;
  title: string;
  description?: string;
  type: ToastType;
};

const toasts: ToastMessage[] = [];
const listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((listener) => listener());
}

export function toast(message: Omit<ToastMessage, 'id'>) {
  const id = Math.random().toString(36).substring(7);
  toasts.push({ ...message, id });
  notify();
  setTimeout(() => {
    const index = toasts.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.splice(index, 1);
      notify();
    }
  }, 5000);
}

export function Toaster() {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const listener = () => setMessages([...toasts]);
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return (
    <ToastProvider>
      {messages.map((message) => (
        <Toast
          key={message.id}
          className={
            message.type === 'error'
              ? 'border-red-500 bg-red-50'
              : message.type === 'success'
              ? 'border-green-500 bg-green-50'
              : 'border-blue-500 bg-blue-50'
          }
        >
          <div>
            <ToastTitle>{message.title}</ToastTitle>
            {message.description && <ToastDescription>{message.description}</ToastDescription>}
          </div>
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
