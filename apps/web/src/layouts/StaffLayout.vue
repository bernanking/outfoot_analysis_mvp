<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { storeToRefs } from "pinia";

import UiPreviewTools from "../components/ui/UiPreviewTools.vue";
import UiStatusBadge from "../components/ui/UiStatusBadge.vue";
import { usePreviewStore } from "../stores/preview";
import { installStickyFocusGuard } from "../app/stickyFocus";
import { consultationFor } from "../data/preview";

const route = useRoute();
const router = useRouter();
const menuOpen = ref(false);
const { role: previewRole, currentUser } = storeToRefs(usePreviewStore());
const isAdmin = computed(() => previewRole.value === "ADMIN");
const navSection = computed(() => route.meta.nav);
// 768~1279px에서는 본문 공간을 위해 좌측 메뉴를 축소 상태로 시작합니다. 1280px 이상에는 영향이 없습니다.
const compactMenu = ref(true);
const menuToggle = ref<HTMLButtonElement | null>(null);
const sideNav = ref<HTMLElement | null>(null);
const mainContent = ref<HTMLElement | null>(null);

async function openMenu(): Promise<void> {
  menuOpen.value = true;
  await nextTick();
  sideNav.value?.querySelector<HTMLAnchorElement>("a")?.focus();
}

async function closeMenu(focusTarget: "toggle" | "main" = "toggle"): Promise<void> {
  menuOpen.value = false;
  await nextTick();
  (focusTarget === "main" ? mainContent.value : menuToggle.value)?.focus();
}

function onSidebarNavigation(): void {
  if (menuOpen.value) void closeMenu("main");
}

function onKeydown(event: KeyboardEvent): void {
  if (menuOpen.value && event.key === "Escape") {
    event.preventDefault();
    void closeMenu();
  }
}

function onResize(): void {
  if (menuOpen.value && window.innerWidth > 767) void closeMenu("main");
}

watch(() => route.fullPath, () => {
  if (menuOpen.value) void closeMenu("main");
});
watch(previewRole, (role) => {
  if (role === "ADMIN") return;
  if (route.meta.requiresAdmin) void router.replace("/403");
  else if (consultationFor(route.params.consultationId)?.deleted) void router.replace("/404");
});
let removeStickyFocusGuard: (() => void) | null = null;
onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("resize", onResize);
  removeStickyFocusGuard = installStickyFocusGuard();
});
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("resize", onResize);
  removeStickyFocusGuard?.();
});
</script>

<template>
  <div class="staff-layout" :class="{ 'staff-layout--compact': compactMenu }">
    <div v-if="menuOpen" class="mobile-scrim" @click="closeMenu()" />
    <aside id="staff-menu" class="sidebar" :class="{ 'sidebar--open': menuOpen }" aria-label="직원용 메뉴">
      <div class="sidebar-header">
        <RouterLink class="brand brand--sidebar" to="/consultations" @click="onSidebarNavigation">
          <span class="brand-mark" aria-hidden="true">O</span><span>OUTFOOT</span>
        </RouterLink>
        <button class="sidebar-close" type="button" aria-label="메뉴 닫기" @click="closeMenu()">×</button>
      </div>
      <p class="sidebar-caption">족부 상담 기록</p>
      <nav ref="sideNav" class="side-nav" aria-label="주요 메뉴">
        <button class="sidebar-compact-toggle" type="button" :aria-expanded="!compactMenu" @click="compactMenu = !compactMenu">{{ compactMenu ? '메뉴 펼치기' : '메뉴 축소' }}</button>
        <p class="nav-heading">상담 관리</p>
        <RouterLink to="/consultations" class="nav-link" :class="{ 'nav-link--active': navSection === 'consultations' }" title="상담 목록" @click="onSidebarNavigation">상담 목록</RouterLink>
        <RouterLink to="/consultations/new" class="nav-link" :class="{ 'nav-link--active': navSection === 'consultation-new' }" title="신규 상담 접수" @click="onSidebarNavigation">신규 상담 접수</RouterLink>
        <p class="nav-heading">환자 관리</p>
        <RouterLink to="/patients" class="nav-link" :class="{ 'nav-link--active': navSection === 'patients' }" @click="onSidebarNavigation">환자 목록</RouterLink>
        <RouterLink to="/patients/new" class="nav-link" :class="{ 'nav-link--active': navSection === 'patient-new' }" @click="onSidebarNavigation">신규 환자 등록</RouterLink>
        <template v-if="isAdmin">
          <p class="nav-heading">운영 관리</p>
          <RouterLink to="/admin/users" class="nav-link" :class="{ 'nav-link--active': navSection === 'admin-users' }" @click="onSidebarNavigation">사용자 관리</RouterLink>
          <p class="nav-subheading">기록 관리</p>
          <RouterLink to="/admin/records/consultations" class="nav-link nav-link--child" :class="{ 'nav-link--active': navSection === 'admin-consultation-records' }" @click="onSidebarNavigation">상담 기록</RouterLink>
          <RouterLink to="/admin/records/audit" class="nav-link nav-link--child" :class="{ 'nav-link--active': navSection === 'admin-audit-records' }" @click="onSidebarNavigation">감사 기록</RouterLink>
        </template>
      </nav>
      <div class="sidebar-foot"><RouterLink to="/login" @click="onSidebarNavigation">로그인 화면으로</RouterLink><p>화면 시안 · 합성 데이터</p></div>
    </aside>

    <div class="staff-content" :inert="menuOpen || undefined">
      <a class="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <header class="staff-topbar">
        <button ref="menuToggle" class="menu-toggle" type="button" :aria-expanded="menuOpen" aria-controls="staff-menu" aria-label="메뉴 열기" @click="openMenu()">☰</button>
        <div class="topbar-organization">
          <span class="organization-name">OUTFOOT 시안 기관</span><span class="organization-short">OUTFOOT</span>
          <UiStatusBadge class="desktop-preview-badge" label="화면 시안 · 합성 데이터" tone="info" />
          <UiStatusBadge class="mobile-preview-badge" label="시안" tone="info" />
        </div>
        <div class="topbar-user">
          <span class="current-user">{{ currentUser.name }} · {{ currentUser.roleLabel }}</span>
          <UiPreviewTools class="preview-tools--popover" short-label="시안 도구">
            <label class="preview-tools-field" for="preview-role">미리보기 역할
              <select id="preview-role" v-model="previewRole">
                <option value="PRACTITIONER">시술자</option>
                <option value="ADMIN">관리자</option>
              </select>
            </label>
          </UiPreviewTools>
          <RouterLink class="logout-link" to="/login">로그인 화면</RouterLink>
        </div>
      </header>
      <main id="main-content" ref="mainContent" class="staff-main" tabindex="-1"><RouterView /></main>
    </div>
  </div>
</template>
