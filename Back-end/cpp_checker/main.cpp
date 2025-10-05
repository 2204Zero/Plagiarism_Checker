// OOP C++ plagiarism checker with Rabin-Karp and Jaccard Shingling
#include <algorithm>
#include <cctype>
#include <fstream>
#include <iostream>
#include <sstream>
#include <string>
#include <unordered_set>
#include <utility>
#include <vector>

class Document {
public:
	std::string text;
	std::vector<int> lineStarts;
	
	explicit Document(std::string t) : text(std::move(t)) {
		calculateLineStarts();
	}

	static Document fromFile(const std::string &path) {
		std::ifstream in(path);
		std::ostringstream ss;
		ss << in.rdbuf();
		return Document(ss.str());
	}

	static std::string toLower(const std::string &s) {
		std::string out = s;
		std::transform(out.begin(), out.end(), out.begin(), [](unsigned char c) { return std::tolower(c); });
		return out;
	}

	void calculateLineStarts() {
		lineStarts.clear();
		lineStarts.push_back(0);
		for (size_t i = 0; i < text.length(); ++i) {
			if (text[i] == '\n') {
				lineStarts.push_back(i + 1);
			}
		}
	}

	int getLineNumber(int position) const {
		for (size_t i = 0; i < lineStarts.size(); ++i) {
			if (i + 1 < lineStarts.size() && position < lineStarts[i + 1]) {
				return static_cast<int>(i + 1);
			}
		}
		return static_cast<int>(lineStarts.size());
	}

	std::string getTextAround(int start, int end, int context = 50) const {
		int contextStart = std::max(0, start - context);
		int contextEnd = std::min(static_cast<int>(text.length()), end + context);
		return text.substr(contextStart, contextEnd - contextStart);
	}
};

struct MatchSpan {
	int startA;
	int endA;
	int startB;
	int endB;
	std::string textA;
	std::string textB;
	int lineA;
	int lineB;
};

class CheckerBase {
public:
	virtual ~CheckerBase() = default;
	virtual double score(const Document &a, const Document &b) = 0;
	virtual std::vector<MatchSpan> matches() const { return {}; }
};

class RabinKarpChecker : public CheckerBase {
private:
	std::vector<MatchSpan> spans;
	static const long long mod = 1000000007LL;
	static const long long base = 257LL;

	std::vector<int> findOccurrences(const std::string &text, const std::string &pattern) {
		std::vector<int> res;
		int n = (int)text.size(), m = (int)pattern.size();
		if (m == 0 || n < m) return res;
		long long h = 1;
		for (int i = 0; i < m - 1; ++i) h = (h * base) % mod;
		long long p = 0, t = 0;
		for (int i = 0; i < m; ++i) {
			p = (p * base + (unsigned char)pattern[i]) % mod;
			t = (t * base + (unsigned char)text[i]) % mod;
		}
		for (int i = 0; i <= n - m; ++i) {
			if (p == t) {
				bool eq = true;
				for (int j = 0; j < m; ++j) {
					if (text[i + j] != pattern[j]) { eq = false; break; }
				}
				if (eq) res.push_back(i);
			}
			if (i < n - m) {
				t = (base * (t - (unsigned char)text[i] * h % mod + mod) % mod + (unsigned char)text[i + m]) % mod;
			}
		}
		return res;
	}

public:
	double score(const Document &a, const Document &b) override {
		spans.clear();
		
		// For identical files, return 100%
		if (a.text == b.text) {
			// Add a single span covering the entire text
			spans.push_back({
				0, (int)a.text.size(), 0, (int)b.text.size(),
				a.text, b.text,
				a.getLineNumber(0), b.getLineNumber(0)
			});
			return 100.0;
		}
		
		// Choose a window size for substrings (e.g., 32)
		const int window = 32;
		if ((int)a.text.size() < window || (int)b.text.size() < window) {
			// For very short texts, do character-by-character comparison
			int matches = 0;
			int minLen = std::min((int)a.text.size(), (int)b.text.size());
			for (int i = 0; i < minLen; ++i) {
				if (a.text[i] == b.text[i]) matches++;
			}
			if (minLen > 0) {
				spans.push_back({
					0, minLen, 0, minLen,
					a.text.substr(0, minLen), b.text.substr(0, minLen),
					a.getLineNumber(0), b.getLineNumber(0)
				});
				return (double)matches * 100.0 / (double)minLen;
			}
			return 0.0;
		}
		
		int total = 0;
		int matched = 0;
		for (int i = 0; i + window <= (int)a.text.size(); i += window) {
			std::string pattern = a.text.substr(i, window);
			auto occ = findOccurrences(b.text, pattern);
			total++;
			if (!occ.empty()) {
				matched++;
				int startB = occ[0];
				int endB = startB + window;
				spans.push_back({
					i, i + window, startB, endB,
					pattern,
					b.text.substr(startB, window),
					a.getLineNumber(i),
					b.getLineNumber(startB)
				});
			}
		}
		if (total == 0) return 0.0;
		return (double)matched * 100.0 / (double)total;
	}

	std::vector<MatchSpan> matches() const override { return spans; }
};

class JaccardChecker : public CheckerBase {
private:
	std::unordered_set<std::string> shinglesA;
	std::unordered_set<std::string> shinglesB;

	static std::vector<std::string> makeShingles(const std::string &s, int k) {
		std::vector<std::string> res;
		if ((int)s.size() < k) return res;
		for (int i = 0; i + k <= (int)s.size(); ++i) {
			res.push_back(s.substr(i, k));
		}
		return res;
	}

public:
	double score(const Document &a, const Document &b) override {
		shinglesA.clear();
		shinglesB.clear();
		const int k = 5; // 5-char shingles
		for (const auto &sh : makeShingles(Document::toLower(a.text), k)) shinglesA.insert(sh);
		for (const auto &sh : makeShingles(Document::toLower(b.text), k)) shinglesB.insert(sh);
		if (shinglesA.empty() && shinglesB.empty()) return 100.0;
		if (shinglesA.empty() || shinglesB.empty()) return 0.0;
		int inter = 0;
		for (const auto &sh : shinglesA) {
			if (shinglesB.find(sh) != shinglesB.end()) inter++;
		}
		double uni = (double)(shinglesA.size() + shinglesB.size() - inter);
		return (double)inter * 100.0 / uni;
	}
};

static std::string jsonEscape(const std::string &s) {
	std::string out;
	out.reserve(s.size());
	for (char c : s) {
		if (c == '"') out += "\\\"";
		else if (c == '\\') out += "\\\\";
		else if (c == '\n') out += "\\n";
		else out += c;
	}
	return out;
}

int main(int argc, char *argv[]) {
	if (argc < 3) {
		std::cerr << "Usage: cpp_checker <file1> <file2>" << std::endl;
		return 1;
	}
	std::string file1 = argv[1];
	std::string file2 = argv[2];
	Document a = Document::fromFile(file1);
	Document b = Document::fromFile(file2);

	RabinKarpChecker rk;
	double rkScore = rk.score(a, b);
	JaccardChecker jc;
	double jcScore = jc.score(a, b);

	// Use Rabin-Karp as primary (exact matches), Jaccard as secondary
	// Only use Jaccard if there are some exact matches
	double localScore;
	if (rkScore > 0) {
		// If there are exact matches, combine both algorithms
		localScore = 0.8 * rkScore + 0.2 * jcScore;
	} else {
		// If no exact matches, use only Rabin-Karp (0%)
		localScore = rkScore;
	}

	// Build JSON with matches from RK
	std::ostringstream out;
	out << "{\"localScore\":" << localScore << ",";
	out << "\"rabinKarpScore\":" << rkScore << ",";
	out << "\"jaccardScore\":" << jcScore << ",";
	out << "\"matches\":[";
	auto spans = rk.matches();
	for (size_t i = 0; i < spans.size(); ++i) {
		const auto &sp = spans[i];
		out << "{\"startA\":" << sp.startA << ",\"endA\":" << sp.endA
			<< ",\"startB\":" << sp.startB << ",\"endB\":" << sp.endB
			<< ",\"textA\":\"" << jsonEscape(sp.textA) << "\""
			<< ",\"textB\":\"" << jsonEscape(sp.textB) << "\""
			<< ",\"lineA\":" << sp.lineA << ",\"lineB\":" << sp.lineB << "}";
		if (i + 1 < spans.size()) out << ",";
	}
	out << "]}";

	std::cout << out.str() << std::endl;
	return 0;
}

