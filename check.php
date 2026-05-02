<?php
header('Content-Type: text/plain');
echo "Checking Headers...\n";
foreach (getallheaders() as $name => $value) {
    echo "$name: $value\n";
}
?>
