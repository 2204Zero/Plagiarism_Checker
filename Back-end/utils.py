import re
import string
from typing import List


def to_lowercase(text: str) -> str:
	return text.lower()


def remove_punctuation(text: str) -> str:
	translator = str.maketrans('', '', string.punctuation)
	return text.translate(translator)


def split_into_sentences(text: str) -> List[str]:
	# Simple sentence splitter; can be replaced with nltk/spacy later
	sentences = re.split(r"(?<=[.!?])\s+", text.strip())
	return [s for s in sentences if s]


def tokenize(text: str) -> List[str]:
	# Basic whitespace tokenizer after punctuation removal
	no_punct = remove_punctuation(text)
	return [tok for tok in no_punct.split() if tok]



