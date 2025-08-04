"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const suggestions = [
  { name: "Sowrov", email: "sowrov@example.com" },
  { name: "jon", email: "jon@example.com" },
  { name: "Apon", email: "gedoba6074@javbing.com" },
];

export default function Dashboard() {
  const [users, setUsers] = useState([
    {
      name: "Apon",
      email: "gedoba6074@javbing.com",
      role: "Shop Owner",
    },
  ]);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(null);
  const [role, setRole] = useState("Admin");
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");

  const handleAddUserClick = () => {
    setIsAdding(true);
    setOpen(true);
  };

  const handleDoneClick = () => {
    const suggestion = suggestions.find((s) => s.name === value);
    if (suggestion && role) {
      setUsers([
        ...users,
        {
          name: suggestion.name,
          email: suggestion.email,
          role,
        },
      ]);
      setSelectedSuggestion(null);
      setValue("");
      setIsAdding(false);
    }
  };
  const filteredSuggestions = suggestions.filter((s) =>
    `${s.name} ${s.email}`.toLowerCase().includes(value.toLowerCase())
  );
  return (
    <Card className="w-full max-w-4xl mx-auto mt-6 rounded-lg p-4 shadow-none">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <h2 className="text-lg font-semibold">Manage Users</h2>
        <Button
          className="flex items-center gap-2"
          size="sm"
          onClick={handleAddUserClick}
          disabled={isAdding}
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </Button>
      </div>
      {isAdding && (
        <div className="mt-4 bg-muted rounded-md px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="relative w-[200px]">
            <input
              type="text"
              className="border  border-gray-300 bg-primary-foreground rounded-md px-3 py-2 w-full text-sm"
              placeholder="Type name or email"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
              }}
            />
            {value && (
              <div className="absolute z-10 mt-1 w-full bg-primary-foreground  rounded-md shadow-lg max-h-60 overflow-y-auto text-sm">
                {filteredSuggestions.length > 0 ? (
                  filteredSuggestions.map((s) => (
                    <div
                      key={s.email}
                      onClick={() => {
                        setValue(s.name);
                        setOpen(false);
                      }}
                      className={
                        open
                          ? `px-3 py-2 bg-primary-foreground cursor-pointer`
                          : "hidden"
                      }
                    >
                      {s.name} ({s.email})
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">
                    User not found
                  </div>
                )}
              </div>
            )}
          </div>

          <Button
            size="icon"
            className="bg-green-500 hover:bg-green-600 text-white"
            onClick={handleDoneClick}
          >
            <Check className="w-4 h-4" />
          </Button>
        </div>
      )}
      {users.map((user, index) => (
        <div
          key={index}
          className="
           bg-muted rounded-md px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between "
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">
                {user.name}
                {index === 0 && <span className="font-medium">(You)</span>}
              </p>
              <p className="text-sm">{user.email}</p>
            </div>
          </div>
          <Badge>Full access</Badge>

          <div className="flex items-center justify-evenly w-full sm:w-auto gap-3">
            <Button variant="ghost" size="icon">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
