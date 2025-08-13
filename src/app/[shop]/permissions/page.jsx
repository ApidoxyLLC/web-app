"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "next-auth/react";
import useFetch from "@/hooks/useFetch";
import { useParams } from "next/navigation";

export default function Dashboard() {
  const { data: session } = useSession();
  const [users, setUsers] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [value, setValue] = useState("");
  const [role] = useState("Admin");
  const [open, setOpen] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null); 

  const shop = useParams();
  const shopId = shop.shop;

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (!value.trim()) {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      try {
        const query = value.includes("@")
          ? `email=${encodeURIComponent(value)}`
          : `username=${encodeURIComponent(value)}`;

        const res = await fetch(`/api/v1/user?${query}`);
        const result = await res.json();

        if (res.ok) {
          setSuggestions([result.data]);
        } else {
          setSuggestions([]);
        }
      } catch (err) {
        console.error("Fetch suggestions error:", err);
        setSuggestions([]);
      }

      setLoading(false);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [value]);



  const { data } = useFetch(`/${shopId}/staffs`);
  useEffect(() => {
    if (data) {
      setUsers((prev) => [...prev, ...data]);
    }
  }, [data]);

  const handleAddUserClick = () => {
    setIsAdding(true);
    setOpen(true);
  };

  const handleDoneClick = async () => {
    const selected = suggestions.find((s) => s.email === value);
    if (!selected) return alert("User not selected");

    try {
      setUsers((prev) => [
        ...prev,
        { name: selected.name, email: selected.email, role, referenceId: selected.referenceId || selected.id },
      ]);

      const response = await fetch("/api/v1/permission", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          shop: shopId,
          action: "grant-permission",
          userId: selected.id,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Permission grant failed");
      }

      console.log("✅ Permission granted:", result);
    } catch (err) {
      console.error("❌ Error granting permission:", err.message);
    }

    setValue("");
    setIsAdding(false);
    setOpen(false);
  };

  const filteredSuggestions = suggestions?.filter((s) =>
    `${s.name} ${s.email}`.toLowerCase().includes(value.toLowerCase())
  );
  const handleDelete = async (email) => {
  if (!confirm("Are you sure you want to delete this user?")) return;

  setDeletingUserId(email);

  try {
    const res = await fetch(`/api/v1/${shopId}/staffs`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }), 
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || "Failed to delete user");
    }
    setUsers((prev) => prev.filter((user) => user.email !== email));

    console.log("✅ User deleted successfully:", result);
  } catch (error) {
    console.error("❌ Error deleting user:", error.message);
    alert(`Delete failed: ${error.message}`);
  } finally {
    setDeletingUserId(null);
  }
};

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
              className="border border-gray-300 bg-primary-foreground rounded-md px-3 py-2 w-full text-sm"
              placeholder="Type email"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setOpen(true);
              }}
            />
            {value && (
              <div className="absolute z-10 mt-1 w-full bg-primary-foreground rounded-md shadow-lg max-h-60 overflow-y-auto text-sm">
                {loading ? (
                  <div className="px-3 py-2 text-muted-foreground">Loading...</div>
                ) : filteredSuggestions?.length > 0 ? (
                  filteredSuggestions.map((s) => (
                    <div
                      key={s.referenceId || s.id}
                      onClick={() => {
                        setValue(s.email);
                        setOpen(false);
                      }}
                      className={open ? "px-3 py-2 bg-primary-foreground cursor-pointer" : "hidden"}
                    >
                      {s.name} ({s.email})
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-2 text-muted-foreground">User not found</div>
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
      {loadingUsers && (
        <div className="text-center py-4 text-muted-foreground">Loading users...</div>
      )}
      {console.log(users)}
      {users?.map((user, index) => (
        <div
          key={user.referenceId || index}
          className="bg-muted rounded-md px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">
                {user.name}
              </p>
              <p className="text-sm">{user.email}</p>
            </div>
          </div>
          <Badge>Full access</Badge>
          <div className="flex items-center justify-evenly w-full sm:w-auto gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(user.email)}
              disabled={deletingUserId === user.email}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}
