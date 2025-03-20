import csv
import sys
import os
import pprint


def getGlobalFilepath(filename):
  return os.path.join(os.path.dirname(__file__), filename)

def main(in_csv, out_path):
  stack = []
  with open(out_path, "w+") as outfile:
    with open(in_csv, newline='') as csvfile:
      matchReader = csv.reader(csvfile, delimiter=',', quotechar='"')
      for index, row in enumerate(matchReader):
        instructions = "".join([f'~setLine,{colindex},{"" if cell == "_" else cell}' for colindex, cell in enumerate(row) if cell != ''])
        line = "_" + instructions if instructions != "" else "" 
        outfile.write(f'{line}\n')
        stack.append(row)
        pprint.pprint(stack)

if __name__ == "__main__":  
  in_csv_name = sys.argv[1]
  in_csv = getGlobalFilepath(in_csv_name)
  out_path_name = sys.argv[2]
  out_path = getGlobalFilepath(out_path_name)
  main(in_csv, out_path)





