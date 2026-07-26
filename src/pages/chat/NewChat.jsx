import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { searchUsers } from "../../services/userService";
import { createConversation } from "../../services/chatService";

import useChatStore from "../../store/useChatStore";

export default function NewChat() {
  const navigate = useNavigate();

  const { selectChat } = useChatStore();

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const currentUserId =
    localStorage.getItem("userId");

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const fetchUsers = async () => {
    try {
      if (!search.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);

      const data = await searchUsers(search);

      const filtered = data.filter(
        (user) => user._id !== currentUserId
      );

      setUsers(filtered);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (user) => {
    try {
      const conversation =
        await createConversation(user._id);

      selectChat(conversation);

      navigate("/chat");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="bg-[#09090B] min-h-screen text-white">
      {/* HEADER */}
      <div className="h-16 flex items-center px-4 border-b border-zinc-900">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="ml-4 font-semibold">
          New Chat
        </h1>
      </div>

      {/* SEARCH */}
      <div className="p-5">
        <div className="relative">
          <Search
            className="absolute left-4 top-4 text-zinc-500"
            size={18}
          />

          <input
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            placeholder="Search users..."
            className="
              w-full
              pl-12
              py-3
              bg-zinc-900
              rounded-xl
              outline-none
            "
          />
        </div>

        {/* RESULTS */}
        <div className="mt-6 space-y-3">
          {loading && (
            <p className="text-zinc-400">
              Searching...
            </p>
          )}

          {!loading &&
            users.map((user) => (
              <button
                key={user._id}
                onClick={() =>
                  handleStartChat(user)
                }
                className="
                  w-full
                  flex
                  items-center
                  gap-3
                  p-3
                  rounded-xl
                  bg-zinc-900
                  hover:bg-zinc-800
                  transition
                "
              >
                <div
                  className="
                    h-12
                    w-12
                    rounded-full
                    bg-purple-600
                    flex
                    items-center
                    justify-center
                    font-bold
                  "
                >
                  {user.name
                    ?.charAt(0)
                    ?.toUpperCase()}
                </div>

                <div className="text-left">
                  <p className="font-medium">
                    {user.name}
                  </p>

                  <p className="text-sm text-zinc-400">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}

          {!loading &&
            search &&
            users.length === 0 && (
              <p className="text-zinc-500">
                No users found
              </p>
            )}
        </div>
      </div>
    </div>
  );
}