package com.techx.intervue.services.interfaces;

import java.nio.file.Path;
import java.util.Optional;

/**
 * File người dùng tải lên (ảnh đại diện, sau này ảnh sản phẩm FR-062). Tên thư mục và tên file chỉ
 * gồm chữ thường, số, gạch ngang và một đuôi file, nên không đi ra ngoài thư mục lưu trữ được.
 */
public interface FileStorageServiceInterface {

    /** Ghi đè nếu đã có file cùng tên. */
    void store(String folder, String fileName, byte[] content);

    /** File đang có trên đĩa; tên sai quy tắc hoặc không tồn tại thì rỗng. */
    Optional<Path> find(String folder, String fileName);

    /** Không có file thì bỏ qua. */
    void delete(String folder, String fileName);
}
