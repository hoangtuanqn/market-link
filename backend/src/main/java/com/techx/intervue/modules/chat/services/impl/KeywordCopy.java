package com.techx.intervue.modules.chat.services.impl;

import java.util.Map;

enum KeywordCopy {
    EN {
        private static final String[] DAYS = {"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"};

        @Override
        String greeting() {
            return "Hi, I am the MarketLink assistant. Ask me to find products, check prices and"
                    + " stock, market hours, which Farmers are at a market, or pickup times.";
        }

        @Override
        String help() {
            return "You can ask, for example:\n"
                    + "• \"Find tomatoes\"\n"
                    + "• \"Tomato price\"\n"
                    + "• \"Ben Thanh market hours\"\n"
                    + "• \"Farmers at Ben Thanh market on Saturday\"\n"
                    + "• \"Pickup times for <stall name>\"";
        }

        @Override
        String fallback() {
            return "Sorry, I did not understand that. Type \"help\" to see what I can answer.";
        }

        @Override
        String dataUnavailable() {
            return "Sorry, the market data is not available right now. Please try again later.";
        }

        @Override
        String askProduct() {
            return "What product are you looking for? For example: \"find tomatoes\".";
        }

        @Override
        String noProducts(String keyword, String where) {
            return "No products found for \"" + keyword + "\"" + where + ". Try another keyword.";
        }

        @Override
        String found(int count, String keyword, String where) {
            return "Found "
                    + count
                    + (count == 1 ? " product" : " products")
                    + " for \""
                    + keyword
                    + "\""
                    + where
                    + ":";
        }

        @Override
        String soldOut() {
            return "sold out";
        }

        @Override
        String left(int quantity, String unit) {
            return quantity + " " + unit + " left";
        }

        @Override
        String at(String place) {
            return " at " + place;
        }

        @Override
        String on(int dayOfWeek) {
            return " on " + day(dayOfWeek);
        }

        @Override
        String forStall(String stall) {
            return " for " + stall;
        }

        @Override
        String day(int dayOfWeek) {
            return DAYS[dayOfWeek];
        }

        @Override
        String unit(String unit) {
            return unit;
        }

        @Override
        String noMarketsOpen() {
            return "No markets are open at the moment.";
        }

        @Override
        String noMarketsOn(int dayOfWeek) {
            return "No markets open on " + day(dayOfWeek) + ".";
        }

        @Override
        String marketsOn(int dayOfWeek) {
            return "Markets open on " + day(dayOfWeek) + ":";
        }

        @Override
        String marketHours() {
            return "Market hours:";
        }

        @Override
        String marketLine(String name, String address, String hours, String days) {
            return name + " (" + address + ") opens " + hours + ", on " + days + ".";
        }

        @Override
        String notSetYet() {
            return "(not set yet)";
        }

        @Override
        String noFarmers(String scope) {
            return "No Farmers" + scope + " yet.";
        }

        @Override
        String farmers(String scope) {
            return "Farmers" + scope + ":";
        }

        @Override
        String askPickup() {
            return "Which stall or market do you want pickup times for? For example: \"pickup"
                    + " times at Ben Thanh market\".";
        }

        @Override
        String noPickup(String scope) {
            return "No pickup times" + scope + " yet.";
        }

        @Override
        String pickup(String scope) {
            return "Pickup times" + scope + ":";
        }

        @Override
        String cutoffNote() {
            return "\nNote: you can edit or cancel an order only before the Farmer's cutoff.";
        }

        @Override
        String more(int count) {
            return "\n… and " + count + " more.";
        }
    },

    VI {
        private static final String[] DAYS = {"CN", "T2", "T3", "T4", "T5", "T6", "T7"};

        private static final Map<String, String> UNITS =
                Map.of(
                        "bunch", "bó",
                        "kg", "kg",
                        "piece", "cái",
                        "litre", "lít",
                        "jar", "hũ",
                        "loaf", "ổ",
                        "bag", "túi",
                        "tray of 30", "khay 30 quả");

        @Override
        String greeting() {
            return "Xin chào, mình là trợ lý MarketLink. Bạn có thể hỏi mình tìm sản phẩm, xem giá"
                    + " và hàng còn lại, giờ họp chợ, sạp nào có mặt ở chợ, hoặc giờ nhận hàng.";
        }

        @Override
        String help() {
            return "Bạn có thể hỏi, ví dụ:\n"
                    + "• \"Tìm cà chua\"\n"
                    + "• \"Cà chua giá bao nhiêu\"\n"
                    + "• \"Chợ Bến Thành mở cửa mấy giờ\"\n"
                    + "• \"Thứ 7 có gian hàng nào ở chợ Bến Thành\"\n"
                    + "• \"Khung giờ nhận hàng của <tên sạp>\"";
        }

        @Override
        String fallback() {
            return "Xin lỗi, mình chưa hiểu câu này. Gõ \"giúp\" để xem mình trả lời được gì.";
        }

        @Override
        String dataUnavailable() {
            return "Xin lỗi, hiện chưa đọc được dữ liệu chợ. Bạn thử lại sau nhé.";
        }

        @Override
        String askProduct() {
            return "Bạn đang tìm sản phẩm gì? Ví dụ: \"tìm cà chua\".";
        }

        @Override
        String noProducts(String keyword, String where) {
            return "Không tìm thấy sản phẩm nào cho \""
                    + keyword
                    + "\""
                    + where
                    + ". Bạn thử từ khoá khác nhé.";
        }

        @Override
        String found(int count, String keyword, String where) {
            return "Tìm thấy " + count + " sản phẩm cho \"" + keyword + "\"" + where + ":";
        }

        @Override
        String soldOut() {
            return "hết hàng";
        }

        @Override
        String left(int quantity, String unit) {
            return "còn " + quantity + " " + unit;
        }

        @Override
        String at(String place) {
            return " ở " + place;
        }

        @Override
        String on(int dayOfWeek) {
            return " vào " + day(dayOfWeek);
        }

        @Override
        String forStall(String stall) {
            return " của " + stall;
        }

        @Override
        String day(int dayOfWeek) {
            return DAYS[dayOfWeek];
        }

        @Override
        String unit(String unit) {
            return UNITS.getOrDefault(unit, unit);
        }

        @Override
        String noMarketsOpen() {
            return "Hiện chưa có chợ nào mở.";
        }

        @Override
        String noMarketsOn(int dayOfWeek) {
            return "Không có chợ nào họp vào " + day(dayOfWeek) + ".";
        }

        @Override
        String marketsOn(int dayOfWeek) {
            return "Các chợ họp vào " + day(dayOfWeek) + ":";
        }

        @Override
        String marketHours() {
            return "Giờ họp chợ:";
        }

        @Override
        String marketLine(String name, String address, String hours, String days) {
            return name + " (" + address + ") mở cửa " + hours + ", các ngày " + days + ".";
        }

        @Override
        String notSetYet() {
            return "(chưa đặt)";
        }

        @Override
        String noFarmers(String scope) {
            return "Chưa có sạp nào" + scope + ".";
        }

        @Override
        String farmers(String scope) {
            return "Các sạp" + scope + ":";
        }

        @Override
        String askPickup() {
            return "Bạn muốn xem giờ nhận hàng của sạp hay chợ nào? Ví dụ: \"khung giờ nhận hàng ở"
                    + " chợ Bến Thành\".";
        }

        @Override
        String noPickup(String scope) {
            return "Chưa có giờ nhận hàng" + scope + ".";
        }

        @Override
        String pickup(String scope) {
            return "Giờ nhận hàng" + scope + ":";
        }

        @Override
        String cutoffNote() {
            return "\nLưu ý: bạn chỉ sửa hoặc huỷ được đơn trước giờ chốt đơn của sạp.";
        }

        @Override
        String more(int count) {
            return "\n… và " + count + " mục nữa.";
        }
    };

    static KeywordCopy forQuestion(boolean vietnamese) {
        return vietnamese ? VI : EN;
    }

    abstract String greeting();

    abstract String help();

    abstract String fallback();

    abstract String dataUnavailable();

    abstract String askProduct();

    abstract String noProducts(String keyword, String where);

    abstract String found(int count, String keyword, String where);

    abstract String soldOut();

    abstract String left(int quantity, String unit);

    abstract String at(String place);

    abstract String on(int dayOfWeek);

    abstract String forStall(String stall);

    abstract String day(int dayOfWeek);

    abstract String unit(String unit);

    abstract String noMarketsOpen();

    abstract String noMarketsOn(int dayOfWeek);

    abstract String marketsOn(int dayOfWeek);

    abstract String marketHours();

    abstract String marketLine(String name, String address, String hours, String days);

    abstract String notSetYet();

    abstract String noFarmers(String scope);

    abstract String farmers(String scope);

    abstract String askPickup();

    abstract String noPickup(String scope);

    abstract String pickup(String scope);

    abstract String cutoffNote();

    abstract String more(int count);
}
