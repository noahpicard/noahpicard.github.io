import csv
import sys
import os
import pprint


def getGlobalFilepath(filename):
  return os.path.join(os.path.dirname(__file__), filename)

def main(in_csv, out_path):
  stack = []
  with open(in_csv, newline='') as csvfile:
    matchReader = csv.reader(csvfile, delimiter=',', quotechar='"')
    for index, row in enumerate(matchReader):
      stack.append(row)
      
  pprint.pprint(stack)
  with open(out_path, "w+") as outfile:
    for row in range(len(stack)):
      line = ""
      outfile.write(f'{line}\n')

    if (len(stack) > 0):
      for colindex in range(len(stack[0])):
        line = "_" + "".join([f'~setLine,{rowindex},{"" if row[colindex] == "_" else row[colindex]}' for rowindex, row in enumerate(stack) if row[colindex] != ''])
        outfile.write(f'{line}\n')
    

if __name__ == "__main__":  
  in_csv_name = sys.argv[1]
  in_csv = getGlobalFilepath(in_csv_name)
  out_path_name = sys.argv[2]
  out_path = getGlobalFilepath(out_path_name)
  main(in_csv, out_path)





