<?php
   $dirArr = scandir("texts");
   $finalText = "";
   $tempStart = "<div class='panel'><p>";
   $tempEnd = "</p></div>";
   foreach ($dirArr as $key => $fileName) {
   	if (strlen($fileName) > 4) {

   		$finalText = $finalText . $tempStart;

   		$file = fopen("texts/" . $fileName, "r") or die("Unable to open file!");
   		if (!feof($file)) {
   			$finalText = $finalText . "<b>" . fgets($file) . "</b><br>";
   		}

   		while(!feof($file)) {
  			$finalText = $finalText . fgets($file) . "<br>";
			}
   		fclose($file);

   		$finalText = $finalText . $tempEnd;
   	}
   }
   echo $finalText;
?>