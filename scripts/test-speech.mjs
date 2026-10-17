import assert from 'node:assert/strict'
import { CaptionBuffer, finishTranscript, mergeParts } from '../src/lib/speechText.ts'

assert.deepEqual(mergeParts([]), { final: '', interim: '' })
assert.deepEqual(mergeParts([{ text: ' hello  there ', isFinal: true }, { text: 'how are', isFinal: false }]), { final: 'hello there', interim: 'how are' })
assert.deepEqual(mergeParts([{ text: 'one', isFinal: true }, { text: 'two', isFinal: true }, { text: '', isFinal: true }]), { final: 'one two', interim: '' }, 'empty results are ignored')
assert.equal(finishTranscript({ final: '', interim: '' }), ''); assert.equal(finishTranscript({ final: 'i went for a walk', interim: 'and it helped' }), 'I went for a walk and it helped')
assert.equal(finishTranscript({ final: 'today was fine , really .', interim: '' }), 'Today was fine, really.', 'no stray space before punctuation')
assert.equal(finishTranscript({ final: '  ', interim: '  ' }), '')

// the iPhone recogniser reports the whole open phrase each time; a final result closes it and the next phrase starts fresh
const b = new CaptionBuffer()
assert.deepEqual(b.push('hello', false), { final: '', interim: 'hello' }); assert.deepEqual(b.push('hello there', false), { final: '', interim: 'hello there' }, 'the open phrase is replaced, not appended')
assert.deepEqual(b.push('hello there', true), { final: 'hello there', interim: '' }); assert.deepEqual(b.push('second', false), { final: 'hello there', interim: 'second' })
assert.deepEqual(b.push('second thought', true), { final: 'hello there second thought', interim: '' }); assert.deepEqual(b.push('', true), { final: 'hello there second thought', interim: '' }, 'an empty final changes nothing')
b.reset(); assert.deepEqual(b.captions(), { final: '', interim: '' })
console.log('speech: all tests passed')
