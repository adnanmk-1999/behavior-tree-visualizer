<script setup lang="ts">
import { onMounted, onUnmounted, ref, shallowRef } from 'vue'
import BehaviorTreeViewer from '@/components/BehaviorTreeViewer.vue'
import PlaybackControls from '@/components/PlaybackControls.vue'
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
    recording.value = await loadBehaviorTreeEvents(recordingRequest.signal, import.meta.env.BASE_URL)
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
  <main>
    <p>Source: <code>{{ xmlUrl }}</code></p>
    <p v-if="loading" role="status">Loading behavior trees…</p>
    <div v-else-if="error" role="alert">
      <h2>Could not load behavior trees</h2>
      <p>{{ error }}</p>
      <p>Check <code>public/tree.xml</code> and the connection, then reload this page.</p>
    </div>
    <template v-else-if="parsedDocument">
      <section aria-labelledby="tree-heading">
        <h2 id="tree-heading">{{ currentTree?.ID ?? 'RobotTree' }}</h2>
        <template v-if="currentTree">
          <nav aria-label="Behavior tree navigation">
            <div class="navigation-actions">
              <button type="button" :disabled="history.length < 2" @click="goTo(history.length - 2)">
                Back
              </button>
              <button type="button" :disabled="history.length < 2" @click="goTo(0)">
                Return to RobotTree
              </button>
            </div>
            <ol class="breadcrumbs">
              <li v-for="(tree, index) in history" :key="index">
                <span v-if="index > 0" aria-hidden="true">&gt;</span>
                <button type="button" :aria-current="index === history.length - 1 ? 'page' : undefined"
                  @click="goTo(index)">
                  {{ breadcrumbLabel(tree) }}
                </button>
              </li>
            </ol>
          </nav>
          <p>
            Instance:
            <code>{{
              currentTree._fullpath === ''
                ? 'RobotTree (root)'
                : (currentTree._fullpath ?? '(path missing)')
            }}</code>
          </p>
          <p v-if="navigationError" role="alert">{{ navigationError }}</p>
          <section aria-label="Recording playback">
            <PlaybackControls :state="playback.state" :disabled="recordingLoading || !recording?.events.length"
              @play="playback.play" @pause="playback.pause" @reset="playback.reset" @seek="playback.seek"
              @set-speed="playback.setSpeed" />
            <p v-if="recordingLoading" role="status">Loading recorded execution…</p>
            <p v-else-if="recordingError" role="alert">{{ recordingError }}</p>
            <p v-else-if="!recording?.events.length" role="status">
              This recording contains no status transitions.
            </p>
            <p v-else>
              {{ recording.events.length.toLocaleString() }} recorded transitions. Nodes show their
              latest status at the selected time; “Not observed” means no transition has been recorded
              yet.
            </p>
            <p v-if="recording?.unmatchedUids?.length" role="status">
              The exporter reported {{ recording.unmatchedUids.length }} UIDs missing from its XML.
              Their events are retained but cannot highlight a matching node.
            </p>
          </section>
          <BehaviorTreeViewer :key="JSON.stringify([currentTree.ID, currentTree._fullpath])" :tree="currentTree"
            :definitions="parsedDocument.behaviorTrees" :node-models="parsedDocument.nodeModels"
            :statuses="playback.statuses" @open-subtree="openSubTree" />
        </template>
        <p v-else role="status">No definition with ID <code>RobotTree</code> was found.</p>
      </section>
      <section aria-labelledby="definitions-heading">
        <h2 id="definitions-heading">
          Behavior Tree definitions ({{ parsedDocument.behaviorTrees.length }})
        </h2>
        <button
          type="button"
          :aria-expanded="showDefinitions"
          aria-controls="tree-definitions"
          @click="showDefinitions = !showDefinitions"
        >
          {{ showDefinitions ? 'Hide definitions' : 'Show definitions' }}
        </button>
        <ul v-show="showDefinitions" id="tree-definitions">
          <li v-for="(tree, index) in parsedDocument.behaviorTrees" :key="index">
            <strong>{{ tree.ID }}</strong>
            — _fullpath:
            <code>{{ tree._fullpath === '' ? '"" (root)' : (tree._fullpath ?? '(missing)') }}</code>
          </li>
        </ul>
      </section>
    </template>
  </main>
</template>

<style scoped>
main {
  max-width: 75rem;
  margin-inline: auto;
  padding: 1rem;
  font-family: system-ui, sans-serif;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

section {
  margin-block-start: 2rem;
}

.navigation-actions,
.breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.breadcrumbs {
  list-style: none;
  padding: 0;
}

.breadcrumbs li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  min-width: 0;
}

button {
  padding: 0.5rem 0.75rem;
  overflow-wrap: anywhere;
}

[aria-current='page'] {
  font-weight: bold;
}
</style>
