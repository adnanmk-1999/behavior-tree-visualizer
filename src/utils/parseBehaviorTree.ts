import { NODE_CATEGORIES } from '../types/behaviorTree.ts'
import type {
  BehaviorTreeDocument,
  BehaviorTreeNode,
  NodeCategory,
  SubTreeReference,
} from '../types/behaviorTree'

function readAttributes(element: Element): Record<string, string> {
  return Object.fromEntries(Array.from(element.attributes, ({ name, value }) => [name, value]))
}

function parseChildren(element: Element): BehaviorTreeNode[] {
  return Array.from(element.children)
    .filter((child) => child.tagName !== 'TreeNodesModel')
    .map(parseNode)
}

function parseNode(element: Element): BehaviorTreeNode {
  const attributes = readAttributes(element)
  const node = {
    tag: element.tagName,
    name: attributes.name,
    _uid: attributes._uid,
    ID: attributes.ID,
    attributes,
  }

  if (element.tagName === 'SubTree') {
    if (!attributes.ID) {
      throw new Error('A <SubTree> reference is missing its ID attribute.')
    }
    if (element.children.length > 0) {
      throw new Error(`<SubTree ID="${attributes.ID}"> must be a reference without child elements.`)
    }

    const reference: SubTreeReference = { ...node, tag: 'SubTree', ID: attributes.ID, children: [] }
    return reference
  }

  return { ...node, children: parseChildren(element) }
}

export function parseBehaviorTree(xml: string): BehaviorTreeDocument {
  const document = new DOMParser().parseFromString(xml, 'application/xml')
  const parseError =
    document.getElementsByTagNameNS(
      'http://www.mozilla.org/newlayout/xml/parsererror.xml',
      'parsererror',
    )[0] ?? document.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'parsererror')[0]
  if (parseError) {
    throw new Error(
      `Invalid XML: ${parseError.textContent?.trim() || 'Unable to parse the document.'}`,
    )
  }

  const root = document.documentElement
  if (root.tagName !== 'root' || root.getAttribute('BTCPP_format') !== '4') {
    throw new Error('Expected a BehaviorTree.CPP document with <root BTCPP_format="4">.')
  }

  const behaviorTrees = Array.from(root.children)
    .filter((element) => element.tagName === 'BehaviorTree')
    .map((element) => {
      const attributes = readAttributes(element)
      if (!attributes.ID) {
        throw new Error('A <BehaviorTree> definition is missing its ID attribute.')
      }

      return {
        ID: attributes.ID,
        _fullpath: attributes._fullpath,
        attributes,
        children: parseChildren(element),
      }
    })

  if (behaviorTrees.length === 0) {
    throw new Error('No <BehaviorTree> definitions were found in the XML document.')
  }

  const nodeModels = new Map<string, NodeCategory>()
  for (const model of Array.from(root.children).filter((el) => el.tagName === 'TreeNodesModel')) {
    for (const entry of Array.from(model.children)) {
      const id = entry.getAttribute('ID')
      if (!id) continue
      const category = NODE_CATEGORIES.find((value) => value === entry.tagName) ?? 'Unknown'
      // Conflicting registrations cannot reliably establish a category.
      nodeModels.set(
        id,
        nodeModels.has(id) && nodeModels.get(id) !== category ? 'Unknown' : category,
      )
    }
  }

  return {
    attributes: readAttributes(root),
    behaviorTrees,
    nodeModels: Object.fromEntries(nodeModels),
  }
}
