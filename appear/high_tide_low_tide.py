import csv
import sys
import os
import pprint

original_poem = """high tide / low tide~styleContent,fontFamily,"Newsreader"~styleContent,lineHeight,1.4~styleContent,fontWeight,400~styleContent,fontWeight,400~styleContent,fontSize,14px

We would always pile up driftwood on those beaches,
stacking a lopsided tipi in the taupe-y sand
some semblance of home formed by three struts
and a kelps tail wrapped width-wise about its topknot~setAutoplayTime,1500

The winds carved the cliffs jagged,
skimmed up loose silica
half-froze the waves over

Some odd determination of children
always drawn to build by the shore
and its wet reaching hands

On return the following morning
the silica flats would be freshly smoothed and salted
no trace remaining of the hopeful settlers
on its shore\\, of their dreaming

(This always being the striving 
of inspired green hands
permanence like salt on my tongue
a spiritual tendon that hoists the body
along by soul until it can no longer)
(and yet)

(A dune nuzzling into calloused pads
instead finds no hurry to placement
skin-through sensation guiding whale bone
into pre-supplicating shapes)
(and thus)

Occasionally we’d find sprawling
a wind-whitened complex - central columns
stout under a radial lattice of dry wood
and filtered light.

Eyes out from the impossible
make-shift windowsills of our seaside bungalow,
The barren space to the tide-line turned apocalypse
And scant sprigs of dune grass marked
the last remnants of sapien’s agrarian history.

How our freshly-squatted mansion was built,
much less abandoned and more importantly
sustained in the railings of storm and tideline
was a mystery slotted amongst the pyramids
and other inexplicable wonders of the world.

All we knew was that\\, through some combination
of care and craftsmanship\\, the beach continued
to reverse that entropic atlantis-making another day.
"""

original_lines = original_poem.split('\n')
original_waypoints = [index for index, row in enumerate(original_lines) if row == '']

final_poem = """high tide / low tide

always piling on those beaches,
stacking a lopsided taupe-y sand
some semblance of home formed
and wrapped width-wise\\, its 

winds carved the cliffs
skimmed up loose silica
froze the waves over

some odd determination
always draws the shore
and its wet reaching hands

returning each morning
silica flats freshly smoothed and salted
remaining hopeful
the shore\\, its dreaming

(the striving 
of
salt
a spirit hoisting its body
until it can no longer)
(and thus)

(each dune nuzzling into
placement
guiding whale bone
into pre-supplicating shapes)
(and thus)

sprawling
wind-whitened complexity
under wood
filtering light.

the impossible
make-shift seaside
the barren space the tide turned
from scant sprigs of dune grass
to an agrarian history

freshly built,
much less and more importantly
sustained by the railings of storm and tideline
slotted amongst the
inexplicability of the world.

through some combination
of care and craft\\, the beach
reverses that entropic atlantis-making another day.
"""

final_lines = final_poem.split('\n')
final_waypoints = [index for index, row in enumerate(final_lines) if row == '']

waves = """I find you in the water the water is freezing there is no space for wishing in the water 

there is only washing and my gasping breaths I find you by the waves turn in the rush of plankton 

and debris the cresting and caressing of a distant shore where immobile I saturate into sand 

when still I sink deep when my shoulders give from pressing atop this surf the collapse will be quiet 

it will have its own unspooling animation of loss the water loses flavor the water loses space 

the water loses forgetting it holds every single thing and can only turn them over and over 

the water and I share are linked in this the water and I are both looking for the one truly immobile thing 

as the ocean bed becomes silt and limestone but each turn mocks in silence behind each smoothed glass 

there is reflection and bubbles and more water and an immeasurable depth of things and 

in the depth there is water in the water there is water it is cold but it is you and it holds me too """

wave_lines = waves.split('\n\n')

print(wave_lines)

maxPosition = 60
wave_frames = 6


def getGlobalFilepath(filename):
  return os.path.join(os.path.dirname(__file__), filename)


def placeWaveLine(wave_line, index):
  clearLines = f"~clearLines,{index},{maxPosition}"
  setLines = f"~setLine,{index},{wave_line}~repeatLine,{index},{maxPosition*3}"
  styleLines = f"~styleLine,{index},width,100vw~styleLine,{index},position,absolute~styleLine,{index},left,-17em"
  colorLines = f"~styleLine,{index},color,{'cornflowerblue'}"
  wrapLines = "".join([
    f"~styleLine,{index},textWrap,auto",
    f"~styleLine,{index},overflowWrap,break-word",
    f"~styleLine,{index},wordWrap,break-word",
    f"~styleLine,{index},wordBreak,break-all",
    f"~styleLine,{index},wordBreak,break-word",
    f"~styleLine,{index},hyphens,auto",
    f"~styleLine,{index},whiteSpace,break-spaces"
  ])
  return clearLines + setLines + styleLines + colorLines + wrapLines

def fillFromLines(lines, start, end, color="black"):
  line = ""
  for index in range(start, end):
    setLine = f"~setLine,{index},{lines[index] if index < len(lines) else ''}"
    line += setLine
    line += f"~styleLine,{index},position,relative~styleLine,{index},left,0"
    line += f"~styleLine,{index},color,{color}"
    unwrapLines = "".join([
      f"~styleLine,{index},textWrap,unset",
      f"~styleLine,{index},overflowWrap,unset",
      f"~styleLine,{index},wordWrap,unset",
      f"~styleLine,{index},wordBreak,unset",
      f"~styleLine,{index},hyphens,unset",
      f"~styleLine,{index},whiteSpace,unset"
    ])
    line += unwrapLines
  return line

def main(in_csv, out_path):
  file_lines = []

  # set up initial lines
  for i in range(6):
    file_lines.append(original_lines[i])

  file_lines += [""] * 60

  print(original_waypoints)
  print(final_waypoints)

  # run a wave for each following waypoints to fill original
  for i in range(1, len(original_waypoints)):
    print("------------")
    waypoint = original_waypoints[i]
    wave_line = wave_lines[min(i, len(wave_lines) - 1)]
    print("waypoint:", waypoint)
    for j_float in range(maxPosition, waypoint, -(maxPosition - waypoint) // wave_frames):
      j = int(j_float)
      print("j:", j)
      line = "_"
      line += placeWaveLine(wave_line, j)
      file_lines.append(line)

    last_j = waypoint
    for j_float in range(waypoint, maxPosition, (maxPosition - waypoint) // wave_frames):
      j = int(j_float)
      print("j:", j)
      line = "_"
      line += placeWaveLine(wave_line, j)
      line += fillFromLines(original_lines[:original_waypoints[i+1]] if i+1 < len(original_waypoints) else original_lines, last_j, j)
      file_lines.append(line)
      last_j = j

  # run a wave for each following waypoints to fill final
  for i in range(0, len(original_waypoints)):
    print("------------")
    waypoint = original_waypoints[i]
    next_waypoint = original_waypoints[i+1] if i+1 < len(original_waypoints) else len(original_lines)
    wave_line = wave_lines[min(i, len(wave_lines) - 1)]
    print("waypoint:", waypoint)
    for j_float in range(maxPosition, waypoint, -(maxPosition - waypoint) // wave_frames):
      j = int(j_float)
      print("j:", j)
      line = "_"
      line += placeWaveLine(wave_line, j)
      if i == 0 and j == waypoint:
        line += "_~setAutoplayTime,1000"
      file_lines.append(line)

    last_j = waypoint
    for j_float in range(waypoint, maxPosition, (maxPosition - waypoint) // wave_frames):
      j = int(j_float)
      print("j:", j)
      line = "_"
      line += placeWaveLine(wave_line, j)
      line += fillFromLines(final_lines, last_j, min(j, next_waypoint), color="#23488b")
      line += fillFromLines(original_lines, next_waypoint, j, color="black")
      if waypoint == 1 and j == 1:
        line += "~styleLine,0,color,#23488b"
      file_lines.append(line)
      last_j = j

 
  # print(file_lines)

  with open(out_path, "w+") as outfile:
    for line in file_lines:
      outfile.write(f'{line}\n')

if __name__ == "__main__":  
  in_csv_name = sys.argv[1]
  in_csv = getGlobalFilepath(in_csv_name)
  out_path_name = sys.argv[2]
  out_path = getGlobalFilepath(out_path_name)
  main(in_csv, out_path)





