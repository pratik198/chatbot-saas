package com.chatbot.saas.knowledgebase.processor;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * WHY this class exists:
 *   AI language models have a "context window" — a limit on how much text
 *   they can process at once. For example, GPT-4 can handle ~8000 tokens (~6000 words).
 *   A 20-page PDF might have 10,000+ words — way too much.
 *
 *   So we split documents into small, overlapping "chunks" before embedding them.
 *   At query time, we only send the most relevant 2-3 chunks, not the whole document.
 *
 * WHAT it does:
 *   Takes a long text string and splits it into a list of smaller chunks.
 *   Uses a sliding window approach with configurable size and overlap.
 *
 * HOW the sliding window works:
 *
 *   Text: "ABCDEFGHIJ" (simplified — imagine these are words)
 *   Chunk size: 4,  Overlap: 2
 *
 *   Chunk 0: "ABCD"    (positions 0-3)
 *   Chunk 1: "CDEF"    (positions 2-5)  ← starts where last chunk was 2 from end
 *   Chunk 2: "EFGH"    (positions 4-7)
 *   Chunk 3: "GHIJ"    (positions 6-9)
 *
 *   Why overlap?
 *   If a key sentence spans chunk boundaries, overlap ensures both chunks contain it.
 *   Without overlap: "The capital of France is" / "Paris, founded in..."
 *   With overlap:    "...The capital of France is" / "The capital of France is Paris..."
 *
 * CONFIGURATION:
 *   DEFAULT_CHUNK_SIZE = 500 words   (good balance: meaningful but not too big)
 *   DEFAULT_OVERLAP    = 50 words    (10% overlap is a common best practice)
 *
 * @Component → Spring manages this as a singleton bean.
 */
@Component
public class TextChunker {

    /** Target number of words per chunk */
    private static final int DEFAULT_CHUNK_SIZE = 500;

    /** Number of words to overlap between consecutive chunks */
    private static final int DEFAULT_OVERLAP = 50;

    /**
     * Splits text into overlapping chunks using word boundaries.
     * Splits on words (not characters) to avoid cutting in the middle of a word.
     *
     * @param text      - the full document text to split
     * @return          - ordered list of text chunks
     */
    public List<String> chunk(String text) {
        return chunk(text, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
    }

    /**
     * Splits text into overlapping chunks with custom size/overlap.
     *
     * @param text      - the full document text
     * @param chunkSize - target number of words per chunk
     * @param overlap   - number of words to share between consecutive chunks
     * @return          - ordered list of text chunks
     */
    public List<String> chunk(String text, int chunkSize, int overlap) {
        List<String> chunks = new ArrayList<>();

        if (text == null || text.isBlank()) {
            return chunks;
        }

        // Split text into individual words
        // \\s+ = one or more whitespace characters (spaces, tabs, newlines)
        String[] words = text.trim().split("\\s+");

        if (words.length == 0) {
            return chunks;
        }

        // If the text is smaller than one chunk, return it as-is
        if (words.length <= chunkSize) {
            chunks.add(String.join(" ", words));
            return chunks;
        }

        // Sliding window: step = chunkSize - overlap
        // Example: chunkSize=500, overlap=50 → step=450
        // So each new chunk starts 450 words after the previous one started
        int step = Math.max(1, chunkSize - overlap);
        int start = 0;

        while (start < words.length) {
            // End of this chunk (don't go past the end of the array)
            int end = Math.min(start + chunkSize, words.length);

            // Join the words for this chunk back into a string
            String chunk = String.join(" ", java.util.Arrays.copyOfRange(words, start, end));
            chunks.add(chunk.trim());

            // Move start forward by one step
            start += step;

            // If the remaining words are smaller than the overlap, we're done
            // (the previous chunk already covered them)
            if (start >= words.length) break;
        }

        return chunks;
    }
}
