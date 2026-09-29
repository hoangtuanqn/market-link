package com.techx.intervue.modules.chat.services.impl;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class UserGuideIndex {

    static final String LOCATION = "classpath:user-guide/*.md";

    private static final double K1 = 1.2;
    private static final double B = 0.75;

    private static final Set<String> STOPWORDS =
            Set.of(
                    "la", "cua", "va", "cac", "nhung", "co", "khong", "duoc", "de", "thi", "nao",
                    "gi", "toi", "minh", "lam", "sao", "the", "nhu", "mot", "nay", "khi", "neu",
                    "se", "da", "dang", "voi", "ve", "hay", "hoac", "a", "an", "to", "of", "and",
                    "or", "is", "are", "how", "what", "do", "does", "i", "my", "can", "in", "on",
                    "for", "it");

    public record Section(String document, String title, String text) {}

    private record Indexed(Section section, Map<String, Integer> termFrequency, int length) {}

    private final List<Indexed> sections;
    private final Map<String, Integer> documentFrequency = new HashMap<>();
    private final double averageLength;

    public UserGuideIndex() {
        this(load());
    }

    UserGuideIndex(List<Section> source) {
        this.sections = source.stream().map(UserGuideIndex::index).toList();
        sections.forEach(s -> s.termFrequency().keySet().forEach(this::countDocument));
        this.averageLength = sections.stream().mapToInt(Indexed::length).average().orElse(1.0);
        log.info("User guide index ready: {} sections", sections.size());
    }

    public List<Section> search(String query, int limit) {
        List<String> terms = tokenize(query);
        if (terms.isEmpty()) {
            return List.of();
        }
        double[] scores = sections.stream().mapToDouble(s -> score(s, terms)).toArray();
        return IntStream.range(0, sections.size())
                .filter(i -> scores[i] > 0)
                .boxed()
                .sorted(Comparator.comparingDouble((Integer i) -> scores[i]).reversed())
                .limit(limit)
                .map(i -> sections.get(i).section())
                .toList();
    }

    public int size() {
        return sections.size();
    }

    private double score(Indexed section, List<String> terms) {
        double total = 0;
        for (String term : terms) {
            Integer tf = section.termFrequency().get(term);
            if (tf == null) {
                continue;
            }
            int df = documentFrequency.getOrDefault(term, 0);
            double idf = Math.log(1 + (sections.size() - df + 0.5) / (df + 0.5));
            double norm = K1 * (1 - B + B * section.length() / averageLength);
            total += idf * (tf * (K1 + 1)) / (tf + norm);
        }
        return total;
    }

    private void countDocument(String term) {
        documentFrequency.merge(term, 1, Integer::sum);
    }

    private static Indexed index(Section section) {
        List<String> words = new ArrayList<>(tokenize(section.text()));
        List<String> heading = tokenize(section.document() + " " + section.title());
        words.addAll(heading);
        words.addAll(heading);
        Map<String, Integer> tf = new HashMap<>();
        words.forEach(w -> tf.merge(w, 1, Integer::sum));
        return new Indexed(section, tf, words.size());
    }

    static List<String> tokenize(String text) {
        List<String> words =
                Arrays.stream(TextNormalizer.normalize(text).split(" "))
                        .filter(w -> w.length() > 1 && !STOPWORDS.contains(w))
                        .toList();
        List<String> terms = new ArrayList<>(words);
        for (int i = 1; i < words.size(); i++) {
            terms.add(words.get(i - 1) + "_" + words.get(i));
        }
        return terms;
    }

    static List<Section> split(String markdown) {
        List<Section> out = new ArrayList<>();
        String document = "";
        String title = null;
        StringBuilder body = new StringBuilder();
        for (String line : markdown.split("\\R")) {
            if (line.startsWith("## ")) {
                addSection(out, document, title, body);
                title = line.substring(3).trim();
                body.setLength(0);
            } else if (line.startsWith("# ")) {
                document = line.substring(2).trim();
            } else {
                body.append(line).append('\n');
            }
        }
        addSection(out, document, title, body);
        return out;
    }

    private static void addSection(
            List<Section> out, String document, String title, StringBuilder body) {
        String text = body.toString().strip();
        if (title != null && !text.isEmpty()) {
            out.add(new Section(document, title, text));
        }
    }

    private static List<Section> load() {
        try {
            Resource[] files = new PathMatchingResourcePatternResolver().getResources(LOCATION);
            Arrays.sort(files, Comparator.comparing(Resource::getFilename));
            List<Section> all = new ArrayList<>();
            for (Resource file : files) {
                all.addAll(split(file.getContentAsString(StandardCharsets.UTF_8)));
            }
            return all;
        } catch (IOException e) {
            throw new UncheckedIOException("Cannot read the user guide at " + LOCATION, e);
        }
    }
}
