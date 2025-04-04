import csv
import sys
import os
import pprint
from functools import reduce

import textwrap

def split_text_by_length(text, max_length):
    """Splits text into parts, each with a maximum length, without breaking words."""
    return textwrap.wrap(text, width=max_length, break_long_words=False, break_on_hyphens=False)

def combine_string_arrays_with_overlap(original, addition, overlap):
  final = []
  for index in range(max(0, len(original) + len(addition) - overlap)):
    if index < len(original):
      final.append(original[index])
    else:
      final.append("")

    addition_index = index - (len(original) - overlap)
    if addition_index >= 0:
      final[index] += addition[addition_index]
  return final


def getGlobalFilepath(filename):
  return os.path.join(os.path.dirname(__file__), filename)

def encode_instruction_text(string):
  return string.replace(",", "\\,")

max_row_index = 23
start_line = 3
final_line = 28

fall_frames = 5
overlap_frames = 3
y_offset = 5
line_height = 1.5

def main(in_csv, out_path):
  stack = []
  with open(in_csv, newline='') as csvfile:
    matchReader = csv.reader(csvfile, delimiter=',', quotechar='"')
    for index, row in enumerate(matchReader):
      if (index >= max_row_index):
        continue
      stack.append([row[0], row[1], row[2], next(n for n in row[3:] if n != '')])
      
  pprint.pprint(stack)

    
  instruction_lines = []
  display_line_count = 1

  for row in stack:
    x_offset, fall_steps, fall_offsets, text = row
    if ("," not in fall_steps):
      fall_steps = ",".join([fall_steps] * fall_frames)
    if ("," not in fall_offsets):
      fall_offsets = ",".join([fall_offsets] * fall_frames)
    fall_steps = fall_steps.split(",")
    fall_offsets = fall_offsets.split(",")
    x_offset = int(x_offset)
    fall_offsets = [int(offset) for offset in fall_offsets]
    keyword = fall_steps[0]

    text_split = split_text_by_length(text, 50)
    pprint.pprint(text_split)
    print(keyword)
    keyword_index = next(i for i, text in enumerate(text_split) if keyword in text)
    if (keyword_index > start_line):
      raise ValueError(f"index_of_key_word is greater than 3 for {keyword}")
    
    display_line_indexes = []

    instruction_lines_for_row = []

    # add initial lines
    for index, line in enumerate(text_split):
      display_index = start_line - keyword_index + index
      set_line = f'~setLine,{display_line_count},{encode_instruction_text(line)}'
      set_position = f'~positionLine,{display_line_count},{x_offset}px,{y_offset + (display_index * line_height)}em'
      instruction_lines_for_row.append(set_line + set_position)
      display_line_indexes.append(display_line_count)
      display_line_count += 1

    #clear initial lines
    instruction_lines_for_row.append("".join([f'~setLine,{line_index},{""}' for line_index in display_line_indexes]))

    keyword_display_index = display_line_indexes[keyword_index]

    # drop the keyword
    fall_instructions = []
    for frame_num in range(fall_frames):
      y_index = start_line + ((final_line - start_line) / fall_frames * frame_num)
      set_keyword_line = f'~setLine,{keyword_display_index},{encode_instruction_text(fall_steps[frame_num])}'
      set_keyword_position = f'~positionLine,{keyword_display_index},{x_offset + fall_offsets[frame_num]}px,{y_offset + (y_index * line_height)}em'
      fall_instructions.append(set_keyword_line + set_keyword_position)

    # change keyword color at end
    fall_instructions = combine_string_arrays_with_overlap(fall_instructions, [f'~styleLine,{keyword_display_index},color,red'], 1)

    # overlap instructions
    instruction_lines_for_row = combine_string_arrays_with_overlap(instruction_lines_for_row, fall_instructions, 1)
    instruction_lines = combine_string_arrays_with_overlap(instruction_lines, instruction_lines_for_row, overlap_frames)

  with open(out_path, "w+") as outfile:
    for row in range(final_line):
      line = ""
      outfile.write(f'{line}\n')

    if (len(stack) > 0):
      for instruction_line in instruction_lines:
        line = "_" + instruction_line
        outfile.write(f'{line}\n')
    

if __name__ == "__main__":  
  in_csv_name = sys.argv[1]
  in_csv = getGlobalFilepath(in_csv_name)
  out_path_name = sys.argv[2]
  out_path = getGlobalFilepath(out_path_name)
  main(in_csv, out_path)





