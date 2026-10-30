<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import BehaviorTreePlayer from '@/components/BehaviorTreePlayer.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useTreeNavigation } from '@/composables/useTreeNavigation'
import type { BehaviorTreeDefinition, BehaviorTreeDocument } from '@/types/behaviorTree'
import { parseBehaviorTree } from '@/utils/parseBehaviorTree'
import { loadBehaviorTreeEvents } from '@/utils/parseBehaviorTreeEvents'
import type { BehaviorTreeRecording, PlaybackMode } from '@/types/behaviorTreeEvents'
import '@/assets/workspace.css'

const parsedDocument = shallowRef<BehaviorTreeDocument | null>(null)
const showDefinitions = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const { history, currentTree, navigationError, openSubTree, goTo } =
  useTreeNavigation(parsedDocument)

const recording = shallowRef<BehaviorTreeRecording | null>(null)
const recordingLoading = ref(true)
const recordingError = ref<string | null>(null)
const mode = ref<PlaybackMode>('replay')
const recordingRequest = new AbortController()
const xmlUrl = `${import.meta.env.BASE_URL}tree.xml`

onMounted(async () => {
  try {
    recording.value = await loadBehaviorTreeEvents(
      recordingRequest.signal,
      import.meta.env.BASE_URL,
    )
  } catch (cause) {
    if (!recordingRequest.signal.aborted) {
      recordingError.value =
        cause instanceof Error ? cause.message : 'Could not load the recording.'
    }
  } finally {
    recordingLoading.value = false
  }
})
onUnmounted(() => recordingRequest.abort())

function breadcrumbLabel(tree: BehaviorTreeDefinition) {
  const matches = parsedDocument.value?.behaviorTrees.filter(
    (definition) => definition.ID === tree.ID,
  )
  return matches && matches.length > 1
    ? `${tree.ID} (${tree._fullpath ?? 'path missing'})`
    : tree.ID
}

onMounted(async () => {
  try {
    const response = await fetch(xmlUrl)
    if (!response.ok) {
      throw new Error(
        response.status === 404
          ? `Missing ${xmlUrl}. Place the BehaviorTree.CPP XML file at public/tree.xml and reload.`
          : `Could not load ${xmlUrl}: HTTP ${response.status} ${response.statusText}.`,
      )
    }
    parsedDocument.value = parseBehaviorTree(await response.text())
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'An unknown error occurred.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="app-shell bt-theme">
    <a v-if="currentTree" class="skip-link" href="#tree-workspace">Skip to visualization</a>
    <header class="app-header">
      <div class="brand">
        <span class="brand-mark">
          <AppIcon name="tree" />
        </span>
        <h1>Behavior Tree Visualizer</h1>
      </div>
      <div class="header-meta">
        <span :title="xmlUrl">
          <AppIcon name="file" /> <span class="filename">tree.xml</span>
        </span>
      </div>
    </header>

    <main class="app-main">
      <div v-if="loading" class="loading-state" role="status">
        <AppIcon name="tree" />
        <h2>Loading behavior trees…</h2>
        <p>Reading the XML definitions and preparing the workspace.</p>
        <div class="loading-placeholder" aria-hidden="true"></div>
      </div>
      <div v-else-if="error" class="notice notice-error" role="alert">
        <h2>Could not load behavior trees</h2>
        <p>{{ error }}</p>
        <p>Check <code>public/tree.xml</code> and the connection, then reload this page.</p>
      </div>
      <template v-else-if="parsedDocument">
        <section class="tree-header" aria-labelledby="tree-heading">
          <div class="tree-title">
            <h2 id="tree-heading" :title="currentTree?.ID ?? 'RobotTree'">
              {{ currentTree?.ID ?? 'RobotTree' }}
            </h2>
            <span class="tree-level">{{ history.length > 1 ? 'Subtree' : 'Root tree' }}</span>
          </div>
          <template v-if="currentTree">
            <nav class="tree-navigation" aria-label="Behavior tree navigation">
              <div class="navigation-actions">
                <button
                  class="ui-button"
                  type="button"
                  :disabled="history.length < 2"
                  @click="goTo(history.length - 2)"
                >
                  <AppIcon name="back" /> Back
                </button>
                <button
                  class="ui-button button-quiet"
                  type="button"
                  :disabled="history.length < 2"
                  @click="goTo(0)"
                >
                  <AppIcon name="home" /> RobotTree
                </button>
              </div>
              <ol class="breadcrumbs">
                <li v-for="(tree, index) in history" :key="index">
                  <AppIcon v-if="index > 0" name="chevron" />
                  <button
                    type="button"
                    :aria-current="index === history.length - 1 ? 'page' : undefined"
                    :title="breadcrumbLabel(tree)"
                    @click="goTo(index)"
                  >
                    {{ breadcrumbLabel(tree) }}
                  </button>
                </li>
              </ol>
            </nav>
            <p class="instance-path">
              Instance
              <code
                :title="
                  currentTree._fullpath === ''
                    ? 'RobotTree (root)'
                    : (currentTree._fullpath ?? '(path missing)')
                "
                >{{
                  currentTree._fullpath === ''
                    ? 'RobotTree (root)'
                    : (currentTree._fullpath ?? '(path missing)')
                }}</code
              >
            </p>
          </template>
        </section>

        <p v-if="navigationError" class="notice notice-error" role="alert">{{ navigationError }}</p>
        <template v-if="currentTree">
          <p v-if="mode === 'live'" class="recording-message" role="status">
            This playground has no live connection. Use Replay to inspect the recording.
          </p>
          <p v-else-if="recordingLoading" class="recording-message" role="status">
            Loading recorded execution…
          </p>
          <p v-else-if="recordingError" class="notice notice-error" role="alert">
            {{ recordingError }}
          </p>
          <div id="tree-workspace" tabindex="-1">
            <BehaviorTreePlayer
              v-model:mode="mode"
              show-mode-switch
              :tree="currentTree"
              :definitions="parsedDocument.behaviorTrees"
              :node-models="parsedDocument.nodeModels"
              :recording="recording"
              @open-subtree="openSubTree"
            />
          </div>
        </template>
        <p v-else class="notice" role="status">
          No definition with ID <code>RobotTree</code> was found.
        </p>

        <section class="definitions" aria-labelledby="definitions-heading">
          <div class="definitions-heading">
            <h2 id="definitions-heading">
              <AppIcon name="list" /> Tree definitions
              <span>{{ parsedDocument.behaviorTrees.length }}</span>
            </h2>
            <button
              class="ui-button button-quiet"
              type="button"
              :aria-expanded="showDefinitions"
              aria-controls="tree-definitions"
              @click="showDefinitions = !showDefinitions"
            >
              {{ showDefinitions ? 'Hide definitions' : 'Show definitions' }}
              <AppIcon :name="showDefinitions ? 'close' : 'down'" />
            </button>
          </div>
          <div v-show="showDefinitions" id="tree-definitions" class="definitions-content">
            <p>
              Each row is a distinct XML definition. Instance paths distinguish repeated tree IDs.
            </p>
            <div class="definitions-table">
              <table>
                <caption class="sr-only">
                  Behavior tree definitions and their full instance paths
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Definition</th>
                    <th scope="col">Instance path</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(tree, index) in parsedDocument.behaviorTrees" :key="index">
                    <th scope="row">{{ tree.ID }}</th>
                    <td>
                      <code>{{
                        tree._fullpath === '' ? '"" (root)' : (tree._fullpath ?? '(missing)')
                      }}</code>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>
        <footer class="app-footer">
          <span>BehaviorTree.CPP v4</span>
          <span>Recorded events · No live robot connection</span>
        </footer>
      </template>
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  container: bt-app / inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
}

#tree-workspace {
  flex: 1 0 400px;
  min-height: 0;
}

.filename,
.tree-title h2,
.instance-path code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skip-link {
  position: absolute;
  top: -5rem;
  left: 1rem;
  z-index: 100;
  padding: 0.75rem 1rem;
  background: var(--bt-surface);
  border-radius: 4px;
}

.skip-link:focus {
  top: 0.75rem;
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  min-height: 48px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--bt-border);
  padding: 8px 16px;
  color: var(--bt-text);
  background: var(--bt-surface);
}

.brand,
.header-meta,
.header-meta > span,
.tree-title,
.navigation-actions,
.definitions-heading,
.definitions-heading h2 {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand {
  min-width: 0;
}

.brand-mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  color: var(--bt-primary);
}

h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  line-height: 28px;
}

.workspace-label,
.header-meta {
  font-size: 0.875rem;
  color: var(--bt-text-secondary);
}

.workspace-label {
  padding-left: 1rem;
  border-left: 1px solid var(--bt-border);
}

.header-meta {
  min-width: 0;
  max-width: 100%;
  gap: 16px;
}

.header-meta > span {
  min-width: 0;
  gap: 8px;
}

.read-only {
  color: var(--bt-text);
}

.app-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 12px 16px 8px;
}

.tree-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.25rem 1.5rem;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.tree-title {
  min-width: 0;
  gap: 8px;
}

.tree-title h2 {
  margin: 0;
  min-width: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
}

.tree-level {
  padding: 0.125rem 0.5rem;
  border: 1px solid var(--bt-border);
  flex-shrink: 0;
  border-radius: 4px;
  color: var(--bt-text-secondary);
  font-size: 12px;
  line-height: 16px;
}

.tree-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
}

.navigation-actions {
  gap: 0.25rem;
  flex-shrink: 0;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  list-style: none;
  padding: 0.25rem;
  margin: 0;
  min-width: 0;
  overflow-x: auto;
}

.breadcrumbs li {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}

.breadcrumbs .app-icon {
  width: 14px;
  color: var(--bt-text-secondary);
}

.breadcrumbs button {
  max-width: 25ch;
  min-height: 32px;
  padding: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-radius: 4px;
  color: var(--bt-text-secondary);
  background: transparent;
  font-size: 0.875rem;
}

.breadcrumbs button:hover {
  color: var(--bt-primary);
  background: var(--bt-primary-soft);
}

.breadcrumbs [aria-current='page'] {
  font-weight: 500;
  color: var(--bt-text);
}

.instance-path {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.5rem;
  margin: 0;
  font-size: 12px;
  line-height: 16px;
  color: var(--bt-text-secondary);
}

.instance-path code {
  overflow-wrap: anywhere;
  min-width: 0;
}

.recording-message {
  margin: 0.5rem 0;
  color: var(--bt-text-secondary);
  font-size: 0.875rem;
}

.definitions {
  margin-top: 0.75rem;
  border: 1px solid var(--bt-border);
  border-radius: 4px;
  background: var(--bt-surface);
}

.definitions-heading {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 0.5rem 1rem;
}

.definitions-heading h2 {
  margin: 0;
  font-size: 16px;
  line-height: 24px;
  font-weight: 500;
}

.definitions-heading h2 span {
  color: var(--bt-text-secondary);
  font-variant-numeric: tabular-nums;
}

.definitions-content > p {
  margin: 0;
  padding: 0.5rem 1rem 1rem;
  color: var(--bt-text-secondary);
  font-size: 0.875rem;
}

.definitions-table {
  max-height: 26rem;
  overflow: auto;
  border-top: 1px solid var(--bt-border);
  border-radius: 0 0 4px 4px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

th,
td {
  padding: 0.75rem 1rem;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid var(--bt-border);
  overflow-wrap: anywhere;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--bt-surface-hover);
  color: var(--bt-text-secondary);
  font-weight: 500;
}

tbody th {
  width: 25%;
  min-width: 10rem;
  font-weight: 500;
}

tbody tr:last-child > * {
  border-bottom: 0;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.875rem 0.25rem 0;
  color: var(--bt-text-secondary);
  font-size: 0.75rem;
}

.loading-state {
  flex: 1;
  padding: 3rem 1rem;
  color: var(--bt-text-secondary);
}

.loading-state h2 {
  color: var(--bt-text);
  font-size: 1.25rem;
}

.loading-placeholder {
  height: 240px;
  margin-top: 2rem;
  border: 1px solid var(--bt-border);
  border-radius: 4px;
  background: var(--bt-surface-hover);
}

@container bt-app (max-width: 1100px) {
  .workspace-label {
    display: none;
  }

  .tree-header {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }

  .tree-navigation {
    max-width: 100%;
    order: 3;
  }
}

@container bt-app (max-width: 600px) {
  .app-header {
    padding: 8px 12px;
    gap: 8px;
  }

  .header-meta {
    width: 100%;
    justify-content: space-between;
    font-size: 12px;
    line-height: 16px;
  }

  .app-main {
    padding: 8px;
  }

  #tree-workspace {
    flex-basis: 800px;
  }

  .tree-navigation {
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .breadcrumbs {
    width: 100%;
  }

  th,
  td {
    padding: 0.625rem;
  }
}
</style>
