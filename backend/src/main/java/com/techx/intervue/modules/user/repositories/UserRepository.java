package com.techx.intervue.modules.user.repositories;

import com.techx.intervue.modules.user.entities.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);

    /** Số điện thoại đã thuộc tài khoản khác (bỏ qua chính user đang sửa). */
    boolean existsByPhoneAndIdNot(String phone, Long id);
}
