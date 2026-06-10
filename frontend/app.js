const STORAGE_KEYS = {
  currentUserId: "db-study-current-user-id",
  isolationLevel: "db-study-isolation-level"
};

const state = {
  users: [],
  groups: [],
  currentUserId: Number(localStorage.getItem(STORAGE_KEYS.currentUserId)) || null,
  isolationLevel:
    localStorage.getItem(STORAGE_KEYS.isolationLevel) || "READ COMMITTED",
  search: "",
  expandedGroupId: null
};

const elements = {
  healthText: document.querySelector("#healthText"),
  noticeText: document.querySelector("#noticeText"),
  refreshButton: document.querySelector("#refreshButton"),
  currentUserSelect: document.querySelector("#currentUserSelect"),
  currentUserInfo: document.querySelector("#currentUserInfo"),
  userForm: document.querySelector("#userForm"),
  groupForm: document.querySelector("#groupForm"),
  searchInput: document.querySelector("#searchInput"),
  isolationLevel: document.querySelector("#isolationLevel"),
  studyList: document.querySelector("#studyList")
};

const request = async (path, options = {}) => {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(
      typeof payload === "string" ? payload : payload.message ?? "요청에 실패했습니다."
    );
  }

  return payload;
};

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return replacements[character];
  });

const normalizeUser = (user) => ({
  ...user,
  userId: Number(user.userId)
});

const normalizeGroup = (group) => ({
  ...group,
  groupId: Number(group.groupId),
  creatorId: Number(group.creatorId),
  maxMembers: Number(group.maxMembers),
  memberCount: Number(group.memberCount),
  members: (group.members ?? []).map((member) => ({
    ...member,
    userId: Number(member.userId)
  }))
});

const getCurrentUser = () =>
  state.users.find((user) => user.userId === state.currentUserId) ?? null;

const isMember = (group, userId) =>
  group.members.some((member) => member.userId === userId);

const setNotice = (message) => {
  elements.noticeText.textContent = message;
};

const renderUserSelect = () => {
  if (state.users.length === 0) {
    elements.currentUserSelect.innerHTML =
      '<option value="">사용자가 없습니다</option>';
    elements.currentUserSelect.disabled = true;
    return;
  }

  elements.currentUserSelect.disabled = false;
  elements.currentUserSelect.innerHTML = state.users
    .map(
      (user) => `
        <option value="${user.userId}" ${
          user.userId === state.currentUserId ? "selected" : ""
        }>
          ${escapeHtml(user.name)} (${escapeHtml(user.email)})
        </option>
      `
    )
    .join("");
};

const renderCurrentUserInfo = () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    elements.currentUserInfo.textContent =
      "먼저 사용자를 선택하거나 새로 등록해주세요.";
    return;
  }

  const joinedCount = state.groups.filter((group) =>
    isMember(group, currentUser.userId)
  ).length;
  const createdCount = state.groups.filter(
    (group) => group.creatorId === currentUser.userId
  ).length;

  elements.currentUserInfo.innerHTML = `
    <strong>${escapeHtml(currentUser.name)}</strong> 님으로 사용 중입니다.<br />
    참여 중인 스터디: ${joinedCount}개<br />
    만든 스터디: ${createdCount}개
  `;
};

const getVisibleGroups = () => {
  const keyword = state.search.trim().toLowerCase();

  if (!keyword) {
    return state.groups;
  }

  return state.groups.filter((group) => {
    const target = `${group.title} ${group.description}`.toLowerCase();
    return target.includes(keyword);
  });
};

const renderGroupCard = (group, currentUser) => {
  const joined = currentUser ? isMember(group, currentUser.userId) : false;
  const isFull = group.memberCount >= group.maxMembers;
  const isExpanded = state.expandedGroupId === group.groupId;

  return `
    <article class="study-item">
      <h3>${escapeHtml(group.title)}</h3>
      <p class="study-meta">
        생성자: ${escapeHtml(group.creatorName)}<br />
        인원: ${group.memberCount} / ${group.maxMembers}<br />
        설명: ${escapeHtml(group.description || "설명이 없습니다.")}
      </p>

      <div class="study-actions">
        <button
          type="button"
          class="secondary"
          data-action="toggle"
          data-group-id="${group.groupId}"
        >
          ${isExpanded ? "상세 닫기" : "상세 보기"}
        </button>
        ${
          joined
            ? `
              <button
                type="button"
                class="danger"
                data-action="leave"
                data-group-id="${group.groupId}"
              >
                참여 취소
              </button>
            `
            : `
              <button
                type="button"
                data-action="join"
                data-group-id="${group.groupId}"
                ${!currentUser || isFull ? "disabled" : ""}
              >
                ${isFull ? "정원 마감" : "참여하기"}
              </button>
            `
        }
      </div>

      ${
        isExpanded
          ? `
            <div class="study-detail">
              <strong>참여자 목록</strong>
              <ul class="member-list">
                ${group.members
                  .map(
                    (member) => `
                      <li>
                        ${escapeHtml(member.name)}
                        ${member.userId === group.creatorId ? "(생성자)" : ""}
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
          : ""
      }
    </article>
  `;
};

const renderStudyList = () => {
  const currentUser = getCurrentUser();
  const groups = getVisibleGroups();

  if (groups.length === 0) {
    elements.studyList.innerHTML =
      '<p class="empty-text">표시할 스터디가 없습니다.</p>';
    return;
  }

  if (!currentUser) {
    elements.studyList.innerHTML = groups.map((g) => renderGroupCard(g, null)).join("");
    return;
  }

  const joined = groups.filter((g) => isMember(g, currentUser.userId));
  const notJoined = groups.filter((g) => !isMember(g, currentUser.userId));

  const section = (title, list, emptyText) => `
    <div class="study-section">
      <h3 class="study-section-title">${title} <span class="study-section-count">${list.length}</span></h3>
      ${list.length === 0
        ? `<p class="empty-text">${emptyText}</p>`
        : list.map((g) => renderGroupCard(g, currentUser)).join("")}
    </div>
  `;

  elements.studyList.innerHTML =
    section("참여 중인 스터디", joined, "참여 중인 스터디가 없습니다.") +
    section("참여 가능한 스터디", notJoined, "참여 가능한 스터디가 없습니다.");
};

const renderAll = () => {
  renderUserSelect();
  renderCurrentUserInfo();
  renderStudyList();
  elements.isolationLevel.value = state.isolationLevel;
  elements.searchInput.value = state.search;
};

const chooseSafeCurrentUser = () => {
  if (state.users.length === 0) {
    state.currentUserId = null;
    return;
  }

  const exists = state.users.some((user) => user.userId === state.currentUserId);

  if (!exists) {
    state.currentUserId = state.users[0].userId;
    localStorage.setItem(STORAGE_KEYS.currentUserId, String(state.currentUserId));
  }
};

const refreshData = async () => {
  elements.refreshButton.disabled = true;
  elements.refreshButton.textContent = "불러오는 중";

  try {
    const [health, users, groups] = await Promise.all([
      request("/health"),
      request("/users"),
      request("/groups")
    ]);

    const groupDetails = await Promise.all(
      groups.map((group) => request(`/groups/${group.groupId}`))
    );

    elements.healthText.textContent = `정상 연결됨 · ${new Date(
      health.databaseTime
    ).toLocaleTimeString("ko-KR")}`;

    state.users = users.map(normalizeUser);
    state.groups = groupDetails.map(normalizeGroup);
    chooseSafeCurrentUser();
    renderAll();
    setNotice("최신 데이터로 화면을 갱신했습니다.");
  } catch (error) {
    elements.healthText.textContent = "서버 연결 실패";
    setNotice(error.message);
  } finally {
    elements.refreshButton.disabled = false;
    elements.refreshButton.textContent = "새로고침";
  }
};

const requireCurrentUser = () => {
  const currentUser = getCurrentUser();

  if (!currentUser) {
    setNotice("먼저 사용자를 선택해주세요.");
    return null;
  }

  return currentUser;
};

const joinGroup = async (groupId) => {
  const currentUser = requireCurrentUser();

  if (!currentUser) {
    return;
  }

  try {
    await request(`/groups/${groupId}/join`, {
      method: "POST",
      body: JSON.stringify({
        userId: currentUser.userId,
        isolationLevel: state.isolationLevel
      })
    });

    setNotice(`${currentUser.name}님이 스터디에 참여했습니다.`);
    await refreshData();
  } catch (error) {
    setNotice(error.message);
  }
};

const leaveGroup = async (groupId) => {
  const currentUser = requireCurrentUser();

  if (!currentUser) {
    return;
  }

  try {
    await request(`/groups/${groupId}/leave`, {
      method: "DELETE",
      body: JSON.stringify({
        userId: currentUser.userId
      })
    });

    setNotice(`${currentUser.name}님의 참여를 취소했습니다.`);
    await refreshData();
  } catch (error) {
    setNotice(error.message);
  }
};

elements.refreshButton.addEventListener("click", () => {
  refreshData();
});

elements.currentUserSelect.addEventListener("change", (event) => {
  state.currentUserId = Number(event.target.value);
  localStorage.setItem(STORAGE_KEYS.currentUserId, String(state.currentUserId));
  renderCurrentUserInfo();
  renderStudyList();
  setNotice("현재 사용자를 변경했습니다.");
});

elements.userForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = document.querySelector("#userName").value.trim();
  const email = document.querySelector("#userEmail").value.trim();

  try {
    const createdUser = normalizeUser(
      await request("/users", {
        method: "POST",
        body: JSON.stringify({ name, email })
      })
    );

    state.currentUserId = createdUser.userId;
    localStorage.setItem(STORAGE_KEYS.currentUserId, String(state.currentUserId));
    elements.userForm.reset();
    setNotice(`${createdUser.name}님을 새 사용자로 등록했습니다.`);
    await refreshData();
  } catch (error) {
    setNotice(error.message);
  }
});

elements.groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const currentUser = requireCurrentUser();

  if (!currentUser) {
    return;
  }

  const title = document.querySelector("#groupTitle").value.trim();
  const description = document.querySelector("#groupDescription").value.trim();
  const maxMembers = Number(document.querySelector("#maxMembers").value);

  try {
    await request("/groups", {
      method: "POST",
      body: JSON.stringify({
        creatorId: currentUser.userId,
        title,
        description,
        maxMembers
      })
    });

    elements.groupForm.reset();
    document.querySelector("#maxMembers").value = "4";
    setNotice("새 스터디를 만들었습니다.");
    await refreshData();
  } catch (error) {
    setNotice(error.message);
  }
});

elements.searchInput.addEventListener("input", (event) => {
  state.search = event.target.value;
  renderStudyList();
});

elements.isolationLevel.addEventListener("change", (event) => {
  state.isolationLevel = event.target.value;
  localStorage.setItem(STORAGE_KEYS.isolationLevel, state.isolationLevel);
});

elements.studyList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");

  if (!button) {
    return;
  }

  const groupId = Number(button.dataset.groupId);
  const action = button.dataset.action;

  if (action === "toggle") {
    state.expandedGroupId =
      state.expandedGroupId === groupId ? null : groupId;
    renderStudyList();
    return;
  }

  if (action === "join") {
    await joinGroup(groupId);
    return;
  }

  if (action === "leave") {
    await leaveGroup(groupId);
  }
});

refreshData();
