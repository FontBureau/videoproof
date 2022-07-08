#! /usr/bin/env bash

# Create an JavaScript/ECMAScript Module from the plain JavaScript file.
# This requires the original diff_match_patch as a git submodule (or copy)
# in the root directory:
#     $ git submodule add https://github.com/google/diff-match-patch.git diff-match-patch

# There's a line:
#    '// CLOSURE:begin_strip'
# After that line definitons to the global namespace are attempted.
# Exclude everything after that line.
#
# These lines:
#     'var DIFF_DELETE = -1;'
#     'var DIFF_INSERT = 1;'
#     'var DIFF_EQUAL = 0;'
# Should become: 
#     'export const DIFF_DELETE = -1;'
#     'export const DIFF_INSERT = 1;'
#     'export const DIFF_EQUAL = 0;'
# Thus find 'var DIFF_'  and replace with 'export const DIFF_'.
#
# Finally add the line
#     'export default diff_match_patch;'



SOURCE=../../../diff-match-patch/javascript/diff_match_patch_uncompressed.js;
TARGET=diff_match_patch.mjs;

cat $SOURCE | \
awk '
BEGIN { print "// CAUTION - DONT EDIT: this file has been created automatically!" }
# exit when this line occurs
/^\/\/ CLOSURE:begin_strip$/ {exit}
# find and replace:
{ sub(/^var DIFF_/,"export const DIFF_"); print }
# finally add default export
END   { print "export default diff_match_patch;"  }
' > $TARGET;

