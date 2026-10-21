<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import BehaviorTreeViewer from '@/components/BehaviorTreeViewer.vue'
import PlaybackControls from '@/components/PlaybackControls.vue'
import AppIcon from '@/components/AppIcon.vue'
import { useBehaviorTreePlayback } from '@/composables/useBehaviorTreePlayback'
import { useTreeNavigation } from '@/composables/useTreeNavigation'
import type { BehaviorTreeDefinition, BehaviorTreeDocument } from '@/types/behaviorTree'
import { parseBehaviorTree } from '@/utils/parseBehaviorTree'
import { loadBehaviorTreeEvents } from '@/utils/parseBehaviorTreeEvents'
import type { BehaviorTreeRecording } from '@/types/behaviorTreeEvents'

const parsedDocument = shallowRef<BehaviorTreeDocument | null>(null)
const showDefinitions = ref(false)
const loading = ref(true)
const error = ref<string | null>(null)
const { history, currentTree, navigationError, openSubTree, goTo } =
  useTreeNavigation(parsedDocument)

const recording = shallowRef<BehaviorTreeRecording | null>(null)
const recordingLoading = ref(true)
const recordingError = ref<string | null>(null)
const playback = useBehaviorTreePlayback(recording)
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
  <div class="app-shell">
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
          <AppIcon name="file" /> tree.xml
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
            <h2 id="tree-heading">{{ currentTree?.ID ?? 'RobotTree' }}</h2>
            <span class="tree-level">{{ history.length > 1 ? 'Subtree' : 'Root tree' }}</span>
          </div>
          <template v-if="currentTree">
            <nav class="tree-navigation" aria-label="Behavior tree navigation">
              <div class="navigation-actions">
                <button class="ui-button" type="button" :disabled="history.length < 2"
                  @click="goTo(history.length - 2)">
                  <AppIcon name="back" /> Back
                </button>
                <button class="ui-button button-quiet" type="button" :disabled="history.length < 2" @click="goTo(0)">
                  <AppIcon name="home" /> RobotTree
                </button>
              </div>
              <ol class="breadcrumbs">
                <li v-for="(tree, index) in history" :key="index">
                  <AppIcon v-if="index > 0" name="chevron" />
                  <button type="button" :aria-current="index === history.length - 1 ? 'page' : undefined"
                    :title="breadcrumbLabel(tree)" @click="goTo(index)">
                    {{ breadcrumbLabel(tree) }}
                  </button>
                </li>
              </ol>
            </nav>
            <p class="instance-path">
              Instance
              <code>{{
                currentTree._fullpath === ''
                  ? 'RobotTree (root)'
                  : (currentTree._fullpath ?? '(path missing)')
              }}</code>
            </p>
          </template>
        </section>

        <p v-if="navigationError" class="notice notice-error" role="alert">{{ navigationError }}</p>
        <template v-if="currentTree">
          <section class="recording-section" aria-label="Recording playback">
            <PlaybackControls :state="playback.state" :disabled="recordingLoading || !recording?.events.length"
              :event-count="recording?.events.length" @play="playback.play" @pause="playback.pause"
              @reset="playback.reset" @seek="playback.seek" @set-speed="playback.setSpeed" />
            <p v-if="recordingLoading" class="recording-message" role="status">
              Loading recorded execution…
            </p>
            <p v-else-if="recordingError" class="notice notice-error" role="alert">
              {{ recordingError }}
            </p>
            <p v-else-if="!recording?.events.length" class="recording-message" role="status">
              No status transitions in this recording. You can still explore the tree.
            </p>
            <p v-if="recording?.unmatchedUids?.length" class="notice" role="status">
              {{ recording.unmatchedUids.length }} recorded UIDs are missing from this XML. Their
              events are retained but cannot highlight a matching node.
            </p>
          </section>
          <div id="tree-workspace" tabindex="-1">
            <BehaviorTreeViewer :key="JSON.stringify([currentTree.ID, currentTree._fullpath])" :tree="currentTree"
              :definitions="parsedDocument.behaviorTrees" :node-models="parsedDocument.nodeModels"
              :statuses="playback.statuses" @open-subtree="openSubTree" />
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
            <button class="ui-button button-quiet" type="button" :aria-expanded="showDefinitions"
              aria-controls="tree-definitions" @click="showDefinitions = !showDefinitions">
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
.skip-link {
  position: absolute;
  top: -5rem;
  left: 1rem;
  z-index: 100;
  padding: 0.75rem 1rem;
  background: var(--surface);
  border-radius: 6px;
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
  min-height: 64px;
  padding: 0.75rem 1.5rem;
  color: #f5f8ff;
  background: var(--navy);
}

.brand,
.header-meta,
.header-meta>span,
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
  color: #c8ddff;
  border: 1px solid #58708e;
  border-radius: 8px;
}

h1 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 650;
  line-height: 1.3;
}

.workspace-label,
.header-meta {
  font-size: 0.875rem;
  color: #c3d2e3;
}

.workspace-label {
  padding-left: 1rem;
  border-left: 1px solid #496079;
}

.header-meta {
  gap: 1.5rem;
}

.header-meta>span {
  gap: 0.5rem;
}

.read-only {
  color: #e0eaf6;
}

.app-main {
  padding: 1.25rem 1.5rem 0.75rem;
}

.tree-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.25rem 1.5rem;
  margin-bottom: 1rem;
}

.tree-title {
  flex-wrap: wrap;
}

.tree-title h2 {
  margin: 0;
  font-size: 1.625rem;
  font-weight: 650;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
}

.tree-level {
  padding: 0.125rem 0.5rem;
  border: 1px solid #c5d3e4;
  border-radius: 4px;
  color: #405b7a;
  font-size: 0.8125rem;
}

.tree-navigation {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  max-width: 65vw;
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
  color: var(--muted);
}

.breadcrumbs button {
  max-width: 25ch;
  min-height: 40px;
  padding: 0.375rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-radius: 4px;
  color: var(--muted);
  background: transparent;
  font-size: 0.875rem;
}

.breadcrumbs button:hover {
  color: var(--accent);
  background: var(--accent-soft);
}

.breadcrumbs [aria-current='page'] {
  font-weight: 650;
  color: var(--ink);
}

.instance-path {
  grid-column: 1 / -1;
  display: flex;
  gap: 0.5rem;
  margin: 0;
  font-size: 0.8125rem;
  color: var(--muted);
}

.instance-path code {
  overflow-wrap: anywhere;
  min-width: 0;
}

.recording-section {
  margin-bottom: 0.75rem;
}

.recording-message {
  margin: 0.5rem 0;
  color: var(--muted);
  font-size: 0.875rem;
}

.definitions {
  margin-top: 0.75rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
}

.definitions-heading {
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem 0.5rem 1rem;
}

.definitions-heading h2 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

.definitions-heading h2 span {
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}

.definitions-content>p {
  margin: 0;
  padding: 0.5rem 1rem 1rem;
  color: var(--muted);
  font-size: 0.875rem;
}

.definitions-table {
  max-height: 26rem;
  overflow: auto;
  border-top: 1px solid var(--line);
  border-radius: 0 0 8px 8px;
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
  border-bottom: 1px solid var(--line);
  overflow-wrap: anywhere;
}

thead th {
  position: sticky;
  top: 0;
  background: var(--surface-soft);
  color: var(--muted);
  font-weight: 600;
}

tbody th {
  width: 25%;
  min-width: 10rem;
  font-weight: 600;
}

tbody tr:last-child>* {
  border-bottom: 0;
}

.app-footer {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.875rem 0.25rem 0;
  color: var(--muted);
  font-size: 0.75rem;
}

.loading-state {
  min-height: 65vh;
  padding: 3rem 1rem;
  color: var(--muted);
}

.loading-state h2 {
  color: var(--ink);
  font-size: 1.25rem;
}

.loading-placeholder {
  height: 40vh;
  margin-top: 2rem;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface-soft);
}

@media (max-width: 1100px) {
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

@media (max-width: 600px) {
  .app-header {
    padding: 0.75rem 1rem;
    gap: 0.625rem;
  }

  .header-meta {
    width: 100%;
    justify-content: space-between;
    font-size: 0.8125rem;
  }

  .app-main {
    padding: 1rem 0.75rem 0.5rem;
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
