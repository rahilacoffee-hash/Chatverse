import { ArrowLeft, Check, ImagePlus, Search, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { searchUsers } from "../../services/userService";
import {
  createConversation,
  createGroupConversation,
} from "../../services/chatService";

import useChatStore from "../../store/useChatStore";
import axiosInstance from "../../services/axiosInstance";

export default function NewChat() {
  const navigate = useNavigate();

  const { selectChat } = useChatStore();

  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupIcon, setGroupIcon] = useState(null);
  const [groupIconPreview, setGroupIconPreview] = useState("");

  const currentUserId = localStorage.getItem("userId");

  async function fetchUsers() {
    try {
      if (!search.trim()) {
        setUsers([]);
        return;
      }

      setLoading(true);

      const data = await searchUsers(search);

      const filtered = data.filter((user) => user._id !== currentUserId);

      setUsers(filtered);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchUsers();
    }, 400);

    return () => clearTimeout(timeout);
  }, [search]);

  const handleStartChat = async (user) => {
    try {
      const conversation = await createConversation(user._id);

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

  const selectGroupIcon = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (groupIconPreview) URL.revokeObjectURL(groupIconPreview);
    setGroupIcon(file);
    setGroupIconPreview(URL.createObjectURL(file));
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length < 2) return;
    try {
      setLoading(true);
      let groupAvatar = "";
      if (groupIcon) {
        const form = new FormData();
        form.append("file", groupIcon);
        const upload = await axiosInstance.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        groupAvatar = upload.data.url;
      }
      const conversation = await createGroupConversation(
        groupName,
        selectedUsers.map((user) => user._id),
        groupAvatar,
      );
      selectChat(conversation);
      navigate("/chat");
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cv-page min-h-[100svh] text-white">
      {/* HEADER */}
      <div className="flex h-16 items-center border-b border-white/[.07] px-4 pt-[max(0rem,env(safe-area-inset-top))]">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft />
        </button>

        <h1 className="ml-4 font-semibold">
          {groupMode ? "New Group" : "New Chat"}
        </h1>
      </div>

      {/* SEARCH */}
      <div className="p-5">
        <button
          onClick={() => {
            setGroupMode((value) => !value);
            setSelectedUsers([]);
          }}
          className="cv-elevated mb-4 flex w-full items-center gap-3 rounded-[18px] p-3 text-left text-sm font-medium hover:bg-white/[.07]"
        >
          <span className="cv-accent-gradient flex h-10 w-10 items-center justify-center rounded-xl text-[#071318]">
            <Users size={19} />
          </span>
          {groupMode ? "Switch to one-to-one chat" : "New group"}
        </button>

        {groupMode && (
          <div className="mb-3 flex items-center gap-3">
            <label className="relative grid h-16 w-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-zinc-700">
              <>
                {groupIconPreview ? (
                  <img
                    src={groupIconPreview}
                    alt="Group icon preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus size={22} />
                )}
              </>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={selectGroupIcon}
              />
              {groupIconPreview && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    URL.revokeObjectURL(groupIconPreview);
                    setGroupIcon(null);
                    setGroupIconPreview("");
                  }}
                  aria-label="Remove group icon"
                  className="absolute right-0 top-0 rounded-full bg-black/70 p-1 text-white"
                >
                  <X size={13} />
                </button>
              )}
            </label>
            <input
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
              placeholder="Group subject"
              maxLength="100"
              className="min-w-0 flex-1 rounded-xl bg-zinc-900 px-4 py-3 outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
        )}
        {groupMode && selectedUsers.length > 0 && (
          <p className="mb-3 text-sm text-zinc-400">
            {selectedUsers.length} of at least 2 members selected
          </p>
        )}
        <div className="relative">
          <Search className="absolute left-4 top-4 text-zinc-500" size={18} />

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="cv-focus w-full rounded-[10px] border border-white/10 bg-white/[.045] py-3 pl-12 outline-none placeholder:text-[var(--cv-muted)]"
          />
        </div>

        {/* RESULTS */}
        <div className="mt-6 space-y-3">
          {loading && <p className="text-zinc-400">Searching...</p>}

          {!loading &&
            users.map((user) => (
              <button
                key={user._id}
                onClick={() =>
                  groupMode ? toggleGroupMember(user) : handleStartChat(user)
                }
                className="cv-elevated flex w-full items-center gap-3 rounded-[18px] p-3 transition hover:bg-white/[.07]"
              >
                <div className="cv-accent-gradient flex h-12 w-12 items-center justify-center rounded-full font-bold text-[#071318]">
                  {user.name?.charAt(0)?.toUpperCase()}
                </div>

                <div className="text-left">
                  <p className="font-medium">{user.name}</p>

                  <p className="text-sm text-zinc-400">{user.email}</p>
                </div>
                {groupMode && (
                  <span
                    className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full border ${selectedUsers.some((member) => member._id === user._id) ? "border-green-500 bg-green-500 text-black" : "border-zinc-600"}`}
                  >
                    {selectedUsers.some(
                      (member) => member._id === user._id,
                    ) && <Check size={15} />}
                  </span>
                )}
              </button>
            ))}

          {!loading && search && users.length === 0 && (
            <p className="text-zinc-500">No users found</p>
          )}
        </div>
        {groupMode && (
          <button
            disabled={loading || !groupName.trim() || selectedUsers.length < 2}
            onClick={createGroup}
            className="cv-accent-gradient mt-6 w-full rounded-[10px] py-3 font-semibold text-[#071318] disabled:opacity-40"
          >
            {loading ? "Creating…" : "Create group"}
          </button>
        )}
      </div>
    </div>
  );
}
