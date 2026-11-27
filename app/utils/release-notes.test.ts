import { test } from 'node:test'
import assert from 'node:assert/strict'
import type { MDCNode, MDCRoot } from '@nuxtjs/mdc'
import { toPlainMarkdown } from './release-notes.ts'

const text = (value: string): MDCNode => ({ type: 'text', value })
const element = (tag: string, props: Record<string, unknown>, ...children: MDCNode[]): MDCNode =>
  ({ type: 'element', tag, props, children })
const root = (...children: MDCNode[]): MDCRoot => ({ type: 'root', children })

test('keeps plain Markdown elements and their text', () => {
  const tree = root(
    element('h2', {}, text('Bug Fixes')),
    element('ul', {}, element('li', {}, element('strong', {}, text('map:')), text(' clear the timer')))
  )
  assert.deepEqual(toPlainMarkdown(tree), tree)
})

test('keeps a link\'s href and title, and drops its other properties', () => {
  const tree = root(element('a', { href: 'https://github.com/x', title: 'x', style: 'position:fixed', class: 'big' }, text('x')))
  assert.deepEqual(toPlainMarkdown(tree), root(element('a', { href: 'https://github.com/x', title: 'x' }, text('x'))))
})

test('replaces raw HTML and MDC components by their children', () => {
  const tree = root(
    element('div', { style: 'position:fixed' }, element('p', {}, text('inside'))),
    element('alert', { type: 'danger' }, text('component text')),
    element('p', {}, element('icon', { name: 'x' }), text('after'))
  )
  assert.deepEqual(toPlainMarkdown(tree), root(
    element('p', {}, text('inside')),
    text('component text'),
    element('p', {}, text('after'))
  ))
})

test('drops scripts, styles and comments entirely', () => {
  const tree = root(
    element('style', {}, text('body { display: none }')),
    element('script', {}, text('alert(1)')),
    { type: 'comment', value: 'hidden' },
    element('p', {}, text('kept'))
  )
  assert.deepEqual(toPlainMarkdown(tree), root(element('p', {}, text('kept'))))
})

test('drops images, which plain release notes do not need', () => {
  const tree = root(element('p', {}, element('img', { src: 'https://example.com/pixel.gif', alt: 'pixel' }), text('text')))
  assert.deepEqual(toPlainMarkdown(tree), root(element('p', {}, text('text'))))
})
