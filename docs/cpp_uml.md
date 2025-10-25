# C++ Checker UML (Simplified)

Classes:

- Document
  - text: string
  - +fromFile(path): Document
  - +toLower(s): string

- CheckerBase (abstract)
  - +score(a: Document, b: Document): double
  - +matches(): vector<MatchSpan>

- RabinKarpChecker : CheckerBase
  - spans: vector<MatchSpan>
  - +score(a, b): double
  - +matches(): vector<MatchSpan>

- JaccardChecker : CheckerBase
  - shinglesA: unordered_set<string>
  - shinglesB: unordered_set<string>
  - +score(a, b): double

Structures:

- MatchSpan
  - startA: int
  - endA: int
  - startB: int
  - endB: int








