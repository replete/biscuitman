expect.extend({
    async toHaveVisible(page, selector, timeout = 150) {
        function isElementVisible(page, selector, timeout = 150) {
            return new Promise((resolve) => {
                page.waitForSelector(selector, {visible: true, timeout}).then(() => {
                    resolve(true);
                }).catch(() => {
                    resolve(false);
                })
            })
        }

        let isVisible = await isElementVisible(page, selector, timeout);

        if (isVisible) {
            return {
                message: () => `expected '${selector}' not to be visible`,
                pass: true
            }
        } else {
            return {
                message: () => `expected '${selector}' to be visible`,
                pass: false
            }
        }
    }
})

// await expect(page).toHaveVisible(selector);
// await expect(page).not.toHaveVisible(anotherSelector);
// await expect(page).not.toHaveVisible(yetAnotherSelector, 300);