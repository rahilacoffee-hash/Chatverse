import { ArrowLeft, Check, Search, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { searchUsers } from "../../services/userService";
import { createConversation, createGroupConversation } from "../../services/chatService";

import useChatStore from "../../store/useChatStore";

export default function NewChat() {
  const navigate = useNavigate();

  const { selectChat } = useChatStore();

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

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

  const toggleGroupMember = (user) => {
    setSelectedUsers((current) =>
      current.some((member) => member._id === user._id)
        ? current.filter((member) => member._id !== user._id)
        : [...current, user],
    );
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    try {
      setLoading(true);
      const conversation = await createGroupConversation(groupName, selectedUsers.map((user) => user._id));
      selectChat(conversation);
      navigate("/chat");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
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
          {groupMode ? "New Group" : "New Chat"}
        </h1>
      </div>

      {/* SEARCH */}
      <div className="p-5">
        <button onClick={() => { setGroupMode((value) => !value); setSelectedUsers([]); }} className="mb-4 flex w-full items-center gap-3 rounded-xl bg-zinc-900 p-3 text-left text-sm font-medium hover:bg-zinc-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600"><Users size={19} /></span>
          {groupMode ? "Switch to one-to-one chat" : "New group"}
        </button>

        {groupMode && <input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Group subject" maxLength="100" className="mb-3 w-full rounded-xl bg-zinc-900 px-4 py-3 outline-none focus:ring-2 focus:ring-green-600" />}
        {groupMode && selectedUsers.length > 0 && <p className="mb-3 text-sm text-zinc-400">{selectedUsers.length} of at least 2 members selected</p>}
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
                  groupMode ? toggleGroupMember(user) : handleStartChat(user)
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
                {groupMode && <span className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full border ${selectedUsers.some((member) => member._id === user._id) ? "border-green-500 bg-green-500 text-black" : "border-zinc-600"}`}>{selectedUsers.some((member) => member._id === user._id) && <Check size={15} />}</span>}
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
        {groupMode && <button disabled={loading || !groupName.trim() || selectedUsers.length < 2} onClick={createGroup} className="mt-6 w-full rounded-xl bg-green-600 py-3 font-semibold text-black disabled:opacity-40">{loading ? "Creating…" : "Create group"}</button>}
      </div>
    </div>
  );
}
