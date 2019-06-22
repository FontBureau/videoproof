<?php
namespace TypeNetwork\VideoProof;
require_once("{$_SERVER['DOCUMENT_ROOT']}/videoproof.inc");

$videoproof = new VideoProof();

print $videoproof->pageHead('Video Proof');
print $videoproof->pageSections();
print $videoproof->pageFoot();
