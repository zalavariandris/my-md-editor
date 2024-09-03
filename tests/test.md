
# test selection
## test character selection
### test selection over multiple lines and inline elements
- over multiple lines, and inline elements
- list, nested blockquotes etc,

eg.:
start=10
end = 50
setCharacterSelection(root, [start, end])
TEST IF [start, end]==getCharacterSelection(root)

## getSegmentNode
should return the direct child of the closest blockElement

## getBlockNode
should return the closest block element

## test linenumber And lineOffset selection

