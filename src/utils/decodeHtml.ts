export const decodeHtmlEntities = (str: string): string => {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
};
