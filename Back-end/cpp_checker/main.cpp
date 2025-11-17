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
    std::string raw;
    std::string text;
    std::vector<int> indexMap; // map processed index -> raw index
    std::vector<int> lineStarts;
    // Preprocess: lowercase and normalize whitespace, preserve newlines, and build index map
    static void preprocess(const std::string& s, std::string& out, std::vector<int>& map) {
        out.clear();
        map.clear();
        out.reserve(s.size());
        map.reserve(s.size());
        bool lastSpace = false;
        for (size_t i = 0; i < s.size(); ++i) {
            char c = s[i];
            unsigned char uc = static_cast<unsigned char>(c);
            if (c == '\n') {
                out += '\n';
                map.push_back(static_cast<int>(i));
                lastSpace = false;
            } else if (std::isspace(uc)) {
                if (!lastSpace) {
                    out += ' ';
                    map.push_back(static_cast<int>(i));
                    lastSpace = true;
                }
            } else {
                out += std::tolower(uc);
                map.push_back(static_cast<int>(i));
                lastSpace = false;
            }
        }
    }
    explicit Document(std::string t) : raw(std::move(t)) {
        preprocess(raw, text, indexMap);
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
                lineStarts.push_back(static_cast<int>(i) + 1);
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

    std::string rawSlice(int startProcessed, int endProcessed) const {
        if (startProcessed < 0) startProcessed = 0;
        if (endProcessed < startProcessed) endProcessed = startProcessed;
        if (startProcessed >= (int)indexMap.size()) return std::string();
        int rawStart = indexMap[startProcessed];
        int rawEndIdx = std::min(endProcessed, (int)indexMap.size()) - 1;
        if (rawEndIdx < startProcessed) rawEndIdx = startProcessed;
        int rawEnd = indexMap[rawEndIdx] + 1;
        rawEnd = std::min(rawEnd, (int)raw.size());
        if (rawStart < 0 || rawStart >= (int)raw.size() || rawEnd <= rawStart) return std::string();
        return raw.substr(rawStart, rawEnd - rawStart);
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
            // Add a single span covering the entire text (raw slices)
            spans.push_back({
                0, (int)a.text.size(), 0, (int)b.text.size(),
                a.rawSlice(0, (int)a.text.size()), b.rawSlice(0, (int)b.text.size()),
                a.getLineNumber(0), b.getLineNumber(0)
            });
            return 100.0;
        }
		
		// Choose a window size for substrings (e.g., 8 for better sensitivity with partial matches)
		const int window = 8;
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
                    a.rawSlice(0, minLen), b.rawSlice(0, minLen),
                    a.getLineNumber(0), b.getLineNumber(0)
                });
                return (double)matches * 100.0 / (double)minLen;
            }
			return 0.0;
		}
		
		int total = 0;
		int matched = 0;
        // Use a sliding window with step size 4 for better performance while maintaining accuracy
        auto merge_or_add = [&](int sA, int eA, int sB, int eB){
            // try to merge with an existing span that overlaps on B
            for (auto &sp : spans) {
                bool overlapB = !(eB <= sp.startB || sB >= sp.endB);
                bool overlapA = !(eA <= sp.startA || sA >= sp.endA);
                if (overlapB && overlapA) {
                    sp.startA = std::min(sp.startA, sA);
                    sp.endA = std::max(sp.endA, eA);
                    sp.startB = std::min(sp.startB, sB);
                    sp.endB = std::max(sp.endB, eB);
                    sp.textA = a.rawSlice(sp.startA, sp.endA);
                    sp.textB = b.rawSlice(sp.startB, sp.endB);
                    sp.lineA = a.getLineNumber(sp.startA);
                    sp.lineB = b.getLineNumber(sp.startB);
                    return;
                }
            }
            spans.push_back({
                sA, eA, sB, eB,
                a.rawSlice(sA, eA),
                b.rawSlice(sB, eB),
                a.getLineNumber(sA),
                b.getLineNumber(sB)
            });
        };

        for (int i = 0; i + window <= (int)a.text.size(); i += 4) {
            std::string pattern = a.text.substr(i, window);
            auto occ = findOccurrences(b.text, pattern);
            total++;
            if (!occ.empty()) {
                matched++;
                for (int startB : occ) {
                    int startA = i;
                    int endA = i + window;
                    int endB = startB + window;
                    // Extend backwards
                    while (startA > 0 && startB > 0 && a.text[startA - 1] == b.text[startB - 1]) {
                        startA--; startB--;
                    }
                    // Extend forwards
                    while (endA < (int)a.text.size() && endB < (int)b.text.size() && a.text[endA] == b.text[endB]) {
                        endA++; endB++;
                    }
                    merge_or_add(startA, endA, startB, endB);
                }
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
		// For identical files, return 100%
		if (a.text == b.text) {
			return 100.0;
		}
		
		shinglesA.clear();
		shinglesB.clear();
		// Using smaller shingle size (3) for better sensitivity to partial matches
		const int k = 3;
		for (const auto &sh : makeShingles(Document::toLower(a.text), k)) shinglesA.insert(sh);
		for (const auto &sh : makeShingles(Document::toLower(b.text), k)) shinglesB.insert(sh);
		if (shinglesA.empty() && shinglesB.empty()) return 100.0;
		if (shinglesA.empty() || shinglesB.empty()) return 0.0;
		int inter = 0;
		for (const auto &sh : shinglesA) {
			if (shinglesB.find(sh) != shinglesB.end()) inter++;
		}
		double uni = (double)(shinglesA.size() + shinglesB.size() - inter);
		
		// Calculate similarity score
		double similarity = (double)inter * 100.0 / uni;
		
		// Apply a scaling factor to make partial matches more pronounced
		// This helps prevent the algorithm from showing 0% for partial matches
		if (similarity > 0 && similarity < 20) {
			similarity = 20 + (similarity * 0.8);
		}
		
		return similarity;
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

	// Always combine both algorithms for a more accurate score
	double localScore;
	// If files are identical, keep 100% score
	if (a.text == b.text) {
		localScore = 100.0;
	} 
	// If files are completely different, keep 0% score
	else if (rkScore == 0 && jcScore == 0) {
		localScore = 0.0;
	}
	// For partial matches, combine both algorithms with higher weight to Jaccard
	else {
		// Jaccard is better at detecting partial similarity, so give it more weight
		localScore = 0.4 * rkScore + 0.6 * jcScore;
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

