from collections import Counter

alphabet = "abcdefghijklmnopqrstuvwxyz"
def contains(counter, smaller_counter):
  for letter in smaller_counter:
    if counter.get(letter, 0) < smaller_counter[letter]:
      return False
  return True

class words_node:
  def __init__(self, counter, words_to_counters, max_word_counters, max_depth, depth = 0):
    self.counter = counter
    if depth >= max_depth or [max_word_counter for max_word_counter in max_word_counters if contains(counter, max_word_counter)] != []:
      self.children = None
    else:
      self.children = {
        letter: words_node(Counter({**counter, letter: counter.get(letter, 0) + 1}), 
                          words_to_counters, 
                          max_word_counters, max_depth, depth + 1)
      for letter in alphabet}
    self.words = [word for word in words_to_counters if contains(counter, words_to_counters[word])]
  def find(self, str_remaining):
    if self.children == None:
      return self.words
    else:
      return self.children[str_remaining[0]].find(str_remaining[1:])

class words_trie:
  def __init__(self, words, max_depth = 0):
    max_word_length = max(len(word) for word in words) 
    words_to_counters = {word: Counter(word) for word in words}
    max_word_counters = [words_to_counters[word] for word in words if (len(word) == max_word_length)]  
    print(max_word_counters, max_word_length, words_to_counters)
    self.root = words_node(Counter(""), words_to_counters, max_word_counters, max_depth)

  def find(self, str):
    return self.root.find(str)

def find_longest_word(words, test_str):
  trie = words_trie(words, max_depth = len(test_str))
  c = trie.find(test_str)
  return max(c, key=len)

words_list = ["at", "chat", "cat", "hat", "rat", "that"]

print(words_trie(words_list).root.__dict__)
print(words_trie(words_list).find("rhatee"))
print(find_longest_word(words_list, "rhatee"))






