import * as React from "react";
import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useNavigate, useLocation } from "@remix-run/react";
import {
  CalendarIcon,
  CreditCardIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MessageSquareIcon,
  SettingsIcon,
  UtensilsIcon,
  PlusCircleIcon,
} from "lucide-react";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  const isMenuPage = location.pathname.includes("/dashboard/menu");

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Global Command Menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" />
        
        {/* Modal Content */}
        <div 
            className="relative w-full max-w-lg overflow-hidden rounded-xl border bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
          <Command.Input
            placeholder="Type a command or search..."
            className="w-full border-b px-4 py-3 text-base outline-none placeholder:text-gray-400"
          />
          <Command.List className="max-h-[300px] overflow-y-auto overflow-x-hidden p-2">
            <Command.Empty className="py-6 text-center text-sm text-gray-500">
              No results found.
            </Command.Empty>

            {isMenuPage && (
              <Command.Group heading="Contextual Actions" className="mb-2 px-2 text-xs font-medium text-gray-500">
                <Command.Item
                  onSelect={() => runCommand(() => {
                    // Logic to trigger add category would go here, 
                    // for now we just focus the input if we could, 
                    // or maybe just a toast to show intent.
                    // Ideally we'd use a context/store to trigger the UI state.
                    console.log("Add Category trigger");
                  })}
                  className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
                >
                  <PlusCircleIcon className="h-4 w-4" />
                  <span>Add New Category</span>
                </Command.Item>
              </Command.Group>
            )}

            <Command.Group heading="Navigation" className="mb-2 px-2 text-xs font-medium text-gray-500">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard"))}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
              >
                <LayoutDashboardIcon className="h-4 w-4" />
                <span>Overview</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard/menu"))}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
              >
                <UtensilsIcon className="h-4 w-4" />
                <span>Menu Editor</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard/chat"))}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
              >
                <MessageSquareIcon className="h-4 w-4" />
                <span>AI Chat</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard/operations"))}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
              >
                <CalendarIcon className="h-4 w-4" />
                <span>Operations & Hours</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard/settings"))}
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
              >
                <SettingsIcon className="h-4 w-4" />
                <span>Settings</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="System" className="px-2 text-xs font-medium text-gray-500">
              <Command.Item
                onSelect={() => runCommand(() => navigate("/dashboard/settings"))} // Billing is in settings usually
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 aria-selected:bg-blue-50 aria-selected:text-blue-700"
              >
                <CreditCardIcon className="h-4 w-4" />
                <span>Billing</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => document.getElementById("logout-form")?.submit())} // Assuming logout form exists
                className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm text-red-600 hover:bg-red-50 aria-selected:bg-red-50"
              >
                <LogOutIcon className="h-4 w-4" />
                <span>Sign Out</span>
              </Command.Item>
            </Command.Group>
          </Command.List>
        </div>
    </Command.Dialog>
  );
}
